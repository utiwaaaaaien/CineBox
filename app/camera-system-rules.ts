import type { CanonicalEquipmentRecord } from "./equipment-catalog.canonical";
import { classifyEquipment } from "./equipment-attributes.ts";

export type RuleCategory = "摄影机" | "镜头" | "滤镜" | "摄影机附件" | "监看" | "移动器材" | "灯光器材" | "录音器材" | "其他";

export type RuleEquipment = CanonicalEquipmentRecord;

export type RuleCustomEquipment = {
  name: string;
  brand: string;
  category: RuleCategory;
  subcategory: string;
  unit: string;
};

export type RuleKitRow = {
  id: string;
  qty: number;
  custom?: RuleCustomEquipment;
};

export type RuleProject = {
  manualSelection?: boolean;
  type: string;
  scale: string;
  days: number;
  cameraCount: number;
  monitoring: string;
  captureStyle: string[];
  sceneConditions?: string[];
  screenFormat?: string;
  baseFps?: number;
  highSpeedFps?: number;
  resolution?: string;
  recordingFormat?: string;
  shootingRatio?: number;
  hoursPerDay?: number;
  powerAccess?: string;
};

export type RuleAddition = {
  id: string;
  qty: number;
  note: string;
  label: string;
  custom?: RuleCustomEquipment;
};

export type CameraSystemCheck = {
  id: string;
  title: string;
  detail: string;
  evidence: string;
  severity: "warning" | "info";
  autoAdd: boolean;
  missing: RuleAddition[];
  total: number;
};

type AdditionSpec = RuleAddition & {
  match: RegExp;
  minimum?: number;
};

function customAddition(
  id: string,
  name: string,
  category: RuleCategory,
  subcategory: string,
  qty: number,
  note: string,
  match: RegExp,
): AdditionSpec {
  return {
    id,
    qty,
    note,
    label: name,
    match,
    custom: { name, brand: "按机型匹配", category, subcategory, unit: "套" },
  };
}

export function buildCameraSystemChecks(
  project: RuleProject,
  kit: RuleKitRow[],
  catalog: readonly RuleEquipment[],
): CameraSystemCheck[] {
  const catalogMap = new Map(catalog.map((item) => [item.id, item]));
  const rows = kit.map((row) => {
    const item = catalogMap.get(row.id) ?? (row.custom ? { id: row.id, ...row.custom } : undefined);
    const text = item ? `${item.brand} ${item.name} ${item.subcategory}` : "";
    return { row, item, text };
  }).filter((entry) => entry.item);
  const allText = rows.map((entry) => entry.text).join("\n");
  const cameraRows = rows.filter((entry) => entry.item?.category === "摄影机");
  const cameraUnits = Math.max(project.cameraCount, cameraRows.reduce((sum, entry) => sum + entry.row.qty, 0), 1);
  const hasCamera = cameraRows.length > 0;
  const hasRonin4D = /ronin\s*4d|如影\s*4d/i.test(allText);
  const hasArri = /arri|alexa/i.test(cameraRows.map((entry) => entry.text).join(" "));
  const hasRed = /\bred\b|v-?raptor|komodo/i.test(cameraRows.map((entry) => entry.text).join(" "));
  const hasCinemaBody = hasArri || hasRed || /venice|burano/i.test(cameraRows.map((entry) => entry.text).join(" "));
  const hasCinemaLens = /atlas|mercury|zeiss|cooke|angenieux|安琴|laowa|gnosis|x-?tract|prime\b|t\d(?:\.\d)?/i.test(
    rows.filter((entry) => entry.item?.category === "镜头").map((entry) => entry.text).join(" "),
  );
  const cinemaSystem = hasCinemaBody || hasCinemaLens || /matte\s*box|lmb-?25|遮光斗/i.test(allText);
  const hasDolly = /dolly|轨道车|摄影车/i.test(allText);
  const hasJib = /jib|摇臂|伸缩炮|howmoco/i.test(allText);
  const sceneConditions = project.sceneConditions ?? [];
  const isHighSpeed = (!project.manualSelection && project.captureStyle.includes("高帧率")) || (project.highSpeedFps ?? 0) > (project.baseFps ?? 25);
  const hoursPerDay = Math.max(1, project.hoursPerDay ?? 10);
  const shootingRatio = Math.max(1, project.shootingRatio ?? 10);
  const mediaPressure =
    (project.resolution === "8K" ? 2 : project.resolution === "6K" ? 1.5 : 1) *
    (project.recordingFormat === "RAW / 高码率" ? 1.8 : project.recordingFormat === "高质量母版" ? 1.25 : 1) *
    (isHighSpeed ? Math.max(1.5, (project.highSpeedFps ?? 50) / Math.max(1, project.baseFps ?? 25)) : 1);
  const mediaSets = project.manualSelection ? 2 : Math.max(2, Math.ceil((project.days * hoursPerDay * shootingRatio * mediaPressure) / 60));
  const batterySets = project.manualSelection ? 4 : Math.max(
    4,
    Math.ceil(hoursPerDay * (project.powerAccess === "稳定市电" ? 0.7 : project.powerAccess === "无市电" ? 1.8 : 1.2)),
  );

  const quantityMatching = (pattern: RegExp) => rows.reduce((sum, entry) => pattern.test(entry.text) ? sum + entry.row.qty : sum, 0);
  const rules: CameraSystemCheck[] = [];
  const addRule = (
    id: string,
    title: string,
    detail: string,
    evidence: string,
    severity: "warning" | "info",
    autoAdd: boolean,
    specs: AdditionSpec[],
  ) => {
    const missing = specs.filter((spec) => quantityMatching(spec.match) < (spec.minimum ?? spec.qty));
    const canAdd = missing.every(spec => spec.custom || catalogMap.get(spec.id)?.published !== false);
    rules.push({ id, title, detail, evidence, severity, autoAdd: autoAdd && canAdd, missing, total: specs.length });
  };

  if (hasCamera) {
    const powerSpecs: AdditionSpec[] = [];
    if (hasRonin4D) {
      powerSpecs.push({
        id: "accessory-tb50",
        qty: Math.max(6, batterySets),
        minimum: Math.max(6, batterySets),
        note: project.manualSelection ? "核对实际拍摄时长、供电方式和电池周转，数量由摄影指导确认" : `按每日 ${hoursPerDay} 小时与${project.powerAccess ?? "部分市电"}确认充电周转`,
        label: "DJI TB50 智能电池",
        match: /tb\s*50/i,
      });
    }
    if (!hasRonin4D || cameraRows.some((entry) => !/ronin\s*4d|如影\s*4d/i.test(entry.text))) {
      powerSpecs.push(customAddition(
        "rule-camera-power",
        "摄影机电池、充电器与供电线套装",
        "摄影机附件",
        "供电",
        Math.max(1, cameraUnits - (hasRonin4D ? 1 : 0)),
        project.manualSelection ? "确认电压、接口、容量及实际工作时长；电池数量在发单前核对" : `确认电压、接口、容量；按每日 ${hoursPerDay} 小时准备约 ${batterySets} 组周转`,
        /摄影机电池|camera\s*batter|v-?mount|gold\s*mount|供电线套装/i,
      ));
    }
    addRule(
      "camera-power",
      "机身供电是否闭环",
      "每套机身需要对应的电池、充电器、供电线和备用量。",
      "历史剧情片器材单通常将监视器电池、充电器与线材单独列入附件套装。",
      "warning",
      true,
      powerSpecs,
    );

    const mediaSpecs: AdditionSpec[] = [];
    if (hasRonin4D) {
      mediaSpecs.push({ id: "accessory-prossd", qty: mediaSets, minimum: mediaSets, note: project.manualSelection ? `按 ${project.resolution ?? "4K"} / ${project.baseFps ?? 25}fps 核对实际码率与容量，数量在测试日确认` : `按 ${project.resolution ?? "4K"} / ${project.recordingFormat ?? "高质量母版"} / ${shootingRatio}:1 估算并在测试日复核`, label: "DJI PROSSD 1TB", match: /prossd/i });
    }
    if (hasArri && /mini\s*lf/i.test(allText)) {
      mediaSpecs.push(
        { id: "eq-codex-codex-960gb-mini-lf-摄影机附件", qty: mediaSets, note: project.manualSelection ? `按 ${project.resolution ?? "4K"} / ${project.baseFps ?? 25}fps 核对实际码率与容量，数量在测试日确认` : `按 ${project.resolution ?? "4K"} / ${project.recordingFormat ?? "高质量母版"} / ${shootingRatio}:1 估算并在测试日复核`, label: "CODEX 960GB MINI LF", match: /codex\s*960gb|mini\s*lf\s*codex/i },
        { id: "eq-codex-codex-reader-摄影机附件", qty: 1, note: "确认雷电/数据接口", label: "CODEX Reader", match: /codex\s*reader/i },
      );
    } else if (!hasRonin4D || cameraRows.length > 1) {
      mediaSpecs.push(customAddition(
        "rule-camera-media",
        "摄影机存储卡、读卡器与备份周转",
        "摄影机附件",
        "存储",
        1,
        project.manualSelection ? `按 ${project.resolution ?? "4K"}、${project.baseFps ?? 25}fps 核对机型、实际码率与备份周转` : `按 ${project.resolution ?? "4K"}、${isHighSpeed ? `${project.highSpeedFps ?? "高"}fps` : `${project.baseFps ?? 25}fps`}、${shootingRatio}:1 拍摄比计算`,
        /codex|prossd|cfexpress|cfast|red\s*ssd|摄影机存储|读卡器/i,
      ));
    }
    addRule(
      "recording-media",
      "存储与读卡是否对应机型",
      "存储介质要同时满足机型、帧率、容量和现场备份周转。",
      "两份清单均标注机身套件配齐；站内检查会把其拆成可确认项。",
      "warning",
      true,
      mediaSpecs,
    );

    const cinemaFilterSpecs: AdditionSpec[] = [];
    if ((!project.manualSelection && !sceneConditions.length) || sceneConditions.includes("日外")) {
      cinemaFilterSpecs.push(cinemaSystem
        ? { id: "filter-nd", qty: 1, note: "至少确认 .3/.6/.9 密度", label: "4×5.65 ND/IRND 滤镜组", match: /\b(?:ir)?nd\b|\b(?:ir)?nd\s*[.\d]|减光镜|灰片/i }
        : customAddition("rule-nd-filter", "与镜头口径匹配的 ND 滤镜组", "滤镜", "ND 滤镜", 1, "确认口径和密度", /\b(?:ir)?nd\b|\b(?:ir)?nd\s*[.\d]|减光镜|灰片/i));
    }
    if (sceneConditions.includes("反光材质")) {
      cinemaFilterSpecs.push(cinemaSystem
        ? { id: "filter-cpl", qty: 1, note: "提前检查旋转方向与色偏", label: "4×5.65 CPL 偏振镜", match: /cpl|polariz|偏振镜/i }
        : customAddition("rule-cpl-filter", "与镜头口径匹配的 CPL 偏振镜", "滤镜", "偏振镜", 1, "确认口径与旋转空间", /cpl|polariz|偏振镜/i));
    }
    if (sceneConditions.includes("风沙/飞沫")) {
      cinemaFilterSpecs.push(cinemaSystem
        ? { id: "eq-通用-4-5-65-filter-clear-滤镜", qty: 1, note: "环境风险高时装入遮光斗", label: "4×5.65 Clear 保护镜", match: /filter\s*clear|clear\s*filter|保护镜/i }
        : customAddition("rule-clear-filter", "与镜头口径匹配的 Clear 保护镜", "滤镜", "保护镜", 1, "根据风沙、飞沫和近距离动作使用", /filter\s*clear|clear\s*filter|保护镜/i));
    }
    if (cinemaFilterSpecs.length) {
      addRule(
        "filter-protection",
        "按场景确认滤镜需求",
        "日外使用 ND 控制曝光；反光材质才需要 CPL；Clear 只在风沙、飞沫等高风险环境中作为保护。",
        `本项目场景条件：${sceneConditions.join("、") || "未填写，按日外基础需求检查"}。`,
        "warning",
        true,
        cinemaFilterSpecs,
      );
    }

    if (cinemaSystem) {
      const focusSpecs: AdditionSpec[] = [
        { id: "accessory-lmb25", qty: Math.max(1, Math.min(cameraUnits, 2)), minimum: Math.max(1, Math.min(cameraUnits, 2)), note: "确认滤镜槽和镜头转接环", label: "ARRI LMB-25 轻型遮光斗", match: /lmb\s*-?\s*25|matte\s*box|遮光斗/i },
        { id: "accessory-wcu4", qty: Math.max(1, Math.min(cameraUnits, 2)), minimum: Math.max(1, Math.min(cameraUnits, 2)), note: "确认马达、底板、齿圈与对焦标记", label: "ARRI WCU-4 无线跟焦器", match: /wcu\s*-?\s*4|无线跟焦|wireless\s*focus/i },
      ];
      if (!project.manualSelection && (project.scale === "完整" || ["剧情片", "TVC"].includes(project.type))) {
        focusSpecs.push({ id: "eq-arri-arri-ff-4-ff-5-follow-focus-kit-摄影机附件", qty: Math.max(1, Math.min(cameraUnits, 2)), note: "保留手动跟焦备份", label: "ARRI FF-5 手动跟焦器", match: /ff\s*-?\s*5|studio\s*follow|手动跟焦/i });
      }
      addRule(
        "cinema-lens-control",
        "电影镜头的遮光与焦点控制",
        "使用电影镜头时，遮光斗、滤镜槽、无线跟焦和手动备份应作为一个系统考虑。",
        "两份清单均同时使用 LMB-25、FF-5 和 WCU-4。",
        "warning",
        true,
        focusSpecs,
      );
    }

    const cinemaVideo = hasCinemaBody || cinemaSystem;
    const transmissionId = cinemaVideo ? "video-vaxis2000" : "video-dji-transmission";
    const transmissionLabel = cinemaVideo ? "Vaxis Storm 2000 无线图传" : "DJI Transmission";
    const monitorId = cinemaVideo ? "video-smallhd702" : "video-dji-monitor";
    const monitorLabel = cinemaVideo ? "SmallHD 702 机头/焦点监视器" : "DJI High-Bright Remote Monitor";
    const videoSpecs: AdditionSpec[] = [
      { id: transmissionId, qty: cameraUnits, minimum: cameraUnits, note: "每个工作机位至少一个发射端", label: transmissionLabel, match: /图传|vaxis.*2000|storm\s*2000|teradek|transmission|wireless\s*video/i },
      { id: monitorId, qty: cameraUnits, minimum: cameraUnits, note: "机头或焦点监看", label: monitorLabel, match: /smallhd|702|703|机头监|焦点监|high-?bright\s*remote\s*monitor/i },
    ];
    if (project.monitoring !== "精简监看") {
      videoSpecs.push({ id: "video-dm240", qty: project.monitoring === "完整监看" ? 2 : 1, minimum: project.monitoring === "完整监看" ? 2 : 1, note: "导演/客户画面确认", label: "DM240 24 英寸导演监视器", match: /dm\s*240|bm\s*240|x\s*2400|24\s*(?:英寸|寸).*监/i });
    }
    addRule(
      "video-chain",
      "每个机位的图传与监看数量",
      "发射端、机头/焦点监视器和导演监视器要按机位与岗位数量配套。",
      "历史剧情片器材单会根据机位与岗位数量分别配置图传、无线监视器和导演监视器。",
      "warning",
      true,
      videoSpecs,
    );

    const supportSpecs: AdditionSpec[] = cinemaSystem
      ? [
        { id: "grip-oconnor2575", qty: Math.max(1, Math.min(cameraUnits, 2)), minimum: Math.max(1, Math.min(cameraUnits, 2)), note: "确认负载、碗口和快装板", label: "OConnor 2575D 液压云台", match: /2575|2065|oconnor/i },
        { id: "grip-ronford-legs", qty: Math.max(1, Math.min(cameraUnits, 2)), minimum: Math.max(1, Math.min(cameraUnits, 2)), note: "高脚、矮脚与低机位组合", label: "Ronford 高低脚组合", match: /ronford|高低脚|高脚|矮脚/i },
      ]
      : [{ id: "grip-teris", qty: cameraUnits, minimum: cameraUnits, note: "每个常规机位一套基础承托", label: "TERIS V20 三脚架系统", match: /teris|图瑞斯|三脚架|液压云台/i }];
    addRule(
      "camera-support",
      "机身承托与高低机位",
      "云台、高脚、矮脚和低机位支撑需要覆盖机身重量和拍摄调度。",
      "两份清单都将 OConnor 2575D、Ronford 高/矮脚和 Hi-hat 作为完整承托链。",
      "warning",
      true,
      supportSpecs,
    );

    addRule(
      "camera-cables",
      "线材、监视器电池与现场附件",
      "图传和监看系统需要 SDI/HDMI、电池、充电器、插排、小监支架和扎带。",
      "这一整套附件在两份原始清单中均单独列项。",
      "warning",
      true,
      [customAddition("rule-video-cables", "SDI/HDMI 线材、监视器电池、充电器、支架与扎带", "摄影机附件", "线材与供电", 1, "发射端、接收端和监视器逐一对应", /sdi.*hdmi|hdmi.*sdi|监视器电池.*充电器/i)],
    );
  }

  if (hasDolly) {
    addRule(
      "dolly-track",
      "轨道车与直/弯轨是否成套",
      "轨道车需要根据路线配直轨、弯轨、接头、垫平物和工具。",
      "历史剧情片器材单会将轨道车与直轨、弯轨及配套工具作为独立调度系统。",
      "warning",
      true,
      [{ id: "grip-track", qty: 1, note: "确认直轨/弯轨数量、接头和垫平工具", label: "重型直弯轨组合", match: /重型(?:直弯)?轨|直轨|弯轨|dolly\s*track|track\b/i }],
    );
  }

  if (hasJib) {
    addRule(
      "remote-head-control",
      "摇臂/伸缩炮的遥控机头链",
      "摇臂或伸缩炮上机后，需要遥控机头、摇轮、无线跟焦、图传与配重同时到位。",
      "历史剧情片器材单会将伸缩摇臂、遥控机头、摇轮、无线跟焦和图传组成完整遥控链。",
      "warning",
      true,
      [
        { id: "grip-ronin2", qty: 1, note: "确认承重、供电和安装板", label: "DJI Ronin 2 遥控机头", match: /ronin\s*2|如影\s*2/i },
        { id: "eq-dji-dji-master-wheels-摄影机附件", qty: 1, note: "遥控云台操作", label: "DJI Master Wheels", match: /master\s*wheels|大师摇轮/i },
        { id: "accessory-wcu4", qty: 1, note: "遥控对焦", label: "ARRI WCU-4 无线跟焦器", match: /wcu\s*-?\s*4|无线跟焦/i },
        { id: "video-vaxis2000", qty: 1, note: "遥控构图与焦点监看", label: "Vaxis Storm 2000 无线图传", match: /图传|vaxis.*2000|storm\s*2000|teradek|transmission/i },
      ],
    );
  }

  if (hasCamera && project.cameraCount > 1) {
    addRule(
      "multi-camera-sync",
      "多机位时码与画面一致性",
      "多机位需要时码/锁相、统一帧率与快门、色彩测试和场记板。",
      "《断片》按机位增加了遮光斗、跟焦、图传、监视器和承托数量；时码仍需在测试日确认。",
      "info",
      false,
      [
        customAddition("rule-timecode", "多机位时码/锁相同步套装", "摄影机附件", "时码", cameraUnits, "每机位一个，开机和换电后复核", /时码|timecode|tentacle|lockit|genlock|锁相/i),
        customAddition("rule-slate", "多机位场记板", "其他", "现场管理", 1, "标注机位、镜号、条次与帧率", /场记板|slate|clapper/i),
      ],
    );
  }

  if (hasDolly || hasJib || (!project.manualSelection && project.scale === "完整")) {
    addRule(
      "set-support",
      "重型调度的垫平与现场支撑",
      "轨道、摇臂和低机位需要苹果箱组、木楼梅、水平工具和安全附件。",
      "两份清单均配置 30/20/10/5cm 苹果箱各两个。",
      "info",
      false,
      [{ id: "other-applebox", qty: 1, note: "全、半、四分之一、薄片组合", label: "苹果箱组合", match: /apple\s*box|苹果箱/i }],
    );
  }

  if (hasCamera) {
    const cameraCatalogRows = cameraRows
      .map((entry) => catalogMap.get(entry.row.id))
      .filter((item): item is RuleEquipment => Boolean(item));
    const lensCatalogRows = rows
      .filter((entry) => entry.item?.category === "镜头")
      .map((entry) => catalogMap.get(entry.row.id))
      .filter((item): item is RuleEquipment => Boolean(item));
    const cameraMounts = [...new Set(cameraCatalogRows.map((item) => classifyEquipment(item).lensMount).filter((mount) => mount !== "unknown"))];
    const lensMounts = [...new Set(lensCatalogRows.map((item) => classifyEquipment(item).lensMount).filter((mount) => mount !== "unknown"))];
    const needsMountAdapter = cameraMounts.length && lensMounts.some((lensMount) => !cameraMounts.includes(lensMount));
    if (needsMountAdapter) {
      const cameraMountLabel = cameraMounts.join("/");
      const lensMountLabel = lensMounts.join("/");
      addRule(
        "camera-lens-mount",
        "机身与镜头卡口兼容",
        `当前机身识别为 ${cameraMountLabel} 卡口，镜头包含 ${lensMountLabel} 卡口。需要确认可用转接、法兰距、后组空间与镜头支撑。`,
        "卡口转接不是只看能否安装；电影镜头还要确认法兰距、15/19mm 杆位、镜头支撑和稳定器重心。",
        "warning",
        false,
        [
          customAddition(
            "rule-lens-mount-adapter",
            `${lensMountLabel} → ${cameraMountLabel} 卡口转接与镜头支撑`,
            "摄影机附件",
            "卡口与镜头支撑",
            1,
            "测试日完成无限远、后组空间、跟焦齿位和承重检查",
            /卡口转接|mount\s*adapter|镜头支撑|lens\s*support/i,
          ),
        ],
      );
    }
  }

  if (isHighSpeed) {
    addRule(
      "high-speed-workflow",
      "高帧率的光量、存储与散热",
      `${project.highSpeedFps ?? "高"}fps 会同时增加照度、码率、存储、回片和机身散热压力，不能只更换摄影机。`,
      project.manualSelection ? `当前拍摄规格：${project.resolution ?? "4K"} / ${project.baseFps ?? 25}fps，升格 ${project.highSpeedFps}fps。` : `当前按 ${project.resolution ?? "4K"} / ${project.recordingFormat ?? "高质量母版"} / ${shootingRatio}:1 拍摄比估算。`,
      "warning",
      false,
      [
        customAddition(
          "rule-high-speed-test",
          "高帧率曝光、频闪、存储与散热测试",
          "其他",
          "测试计划",
          1,
          "测试目标帧率、快门角度、灯具频闪、单卡时长和连续录制温度",
          /高帧率.*测试|high.?speed.*test|频闪.*存储.*散热/i,
        ),
      ],
    );
  }

  if (project.screenFormat === "横竖双版本") {
    addRule(
      "dual-format-framing",
      "横竖双版本的开放门与安全框",
      "横竖双版本需要在测试日确认开放门记录、横竖安全框、字幕安全区与导演监看显示方式。",
      "双版本不是简单后期裁切；构图余量、传感器读取方式和现场监看必须一起确认。",
      "info",
      false,
      [
        customAddition(
          "rule-dual-format-test",
          "横竖双构图安全框与开放门测试",
          "其他",
          "测试计划",
          1,
          "确认横版、竖版与字幕安全区，截图留档",
          /横竖.*安全框|开放门.*测试|dual.?format.*test/i,
        ),
      ],
    );
  }

  return rules;
}
