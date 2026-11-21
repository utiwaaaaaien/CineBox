type RuleReviewDefinition = {
  id: string;
  title: string;
  linked: boolean;
  when: string;
  additions: string;
};

export const systemRuleReview: readonly RuleReviewDefinition[] = [
  {
    id: "camera-power",
    title: "机身供电",
    linked: true,
    when: "已选至少一台摄影机。按器材名称、品牌和子类匹配电池与供电套装。",
    additions: "Ronin 4D 每台至少 6 块 TB50，周转目标更高时按目标数。其余机位各列 1 套电池、充电器与供电线。旧问卷模式根据每日拍摄时长与市电条件估算电池周转。",
  },
  {
    id: "recording-media",
    title: "录制介质与读卡",
    linked: true,
    when: "已选至少一台摄影机，按 Ronin 4D、ALEXA Mini LF 和其余机位分别计算。",
    additions: "手动选材按每台 Ronin 4D 2 块 DJI PROSSD 1TB、每台 Mini LF 2 块 CODEX 960GB 及全组 1 台 CODEX Reader。其余机位各列 1 套存储卡、读卡器与备份周转。旧问卷模式可按天数、日拍时长、拍摄比、分辨率、录制品质和高帧率上调介质数。",
  },
  {
    id: "filter-protection",
    title: "场景滤镜",
    linked: true,
    when: "已有摄影机，并提供了日外、反光材质或风沙／飞沫条件。旧问卷未指定场景时按日外检查。当前选材流程的场景条件为空，因此规则处于未触发状态。",
    additions: "日外列 1 组 ND／IRND，反光列 1 片 CPL，风沙／飞沫列 1 片 Clear。电影系统建议 4×5.65 规格，其他配置列按口径确认的待办项。名称匹配到对应滤镜即可达到规则门槛，尺寸和密度仍须核对。",
  },
  {
    id: "cinema-lens-control",
    title: "电影镜头的遮光与跟焦",
    linked: true,
    when: "已选摄影机，且机身、镜头或遮光斗的名称、品牌或子类符合电影系统识别条件。",
    additions: "ARRI LMB-25 遮光斗及 WCU-4 无线跟焦器各按机位数配置，上限各 2 套。名称识别为同用途的现有器材会计入覆盖。旧问卷模式在完整规模、剧情片或 TVC 中另列同数量的 FF-5 手动备份。",
  },
  {
    id: "video-chain",
    title: "图传与机头监看",
    linked: true,
    when: "已选至少一台摄影机，按电影系统或常规系统选择候选型号。",
    additions: "每机位至少 1 套图传与 1 台机头／焦点监视器。电影系统建议 Vaxis Storm 2000 和 SmallHD 702；常规系统建议 DJI Transmission 和 DJI High-Bright Remote Monitor。非精简监看另需 1 台 DM240，完整监看需 2 台；现行项目按精简监看计算。",
  },
  {
    id: "camera-support",
    title: "云台、脚架与机身承托",
    linked: true,
    when: "已选至少一台摄影机。只统计移动器材中的云台与脚架角色，明确的云台脚架套装两边均计入。",
    additions: "每机位需 1 个云台与 1 组脚架。电影系统缺哪类补哪类，候选为 OConnor 2575D 和 Ronford 高低脚；常规系统若完整套数不足，候选为 TERIS V20 三脚架系统。",
  },
  {
    id: "camera-cables",
    title: "监视器供电与线材",
    linked: true,
    when: "已选至少一台摄影机，同时未识别到含 SDI 与 HDMI、或同时含监视器电池与充电器的相应条目。",
    additions: "全组列 1 套 SDI／HDMI 线材、监视器电池、充电器、支架与扎带；具体接口和长度按发射端、接收端和监视器逐一确认。",
  },
  {
    id: "dolly-track",
    title: "轨道车与轨道",
    linked: true,
    when: "器材名称、品牌或子类匹配轨道车、摄影车或 dolly，且未识别到直轨或弯轨等对应条目。",
    additions: "列 1 组重型直弯轨。直轨、弯轨、接头和垫平工具按实际路线确认。",
  },
  {
    id: "remote-head-control",
    title: "摇臂与遥控机头",
    linked: true,
    when: "器材名称、品牌或子类匹配摇臂、伸缩炮、jib 或 HOWMOCO。",
    additions: "DJI Ronin 2、DJI Master Wheels、ARRI WCU-4、Vaxis Storm 2000 各检查 1 项，已匹配的设备计入覆盖。承重、配重、安装板和供电另行核对。",
  },
  {
    id: "multi-camera-sync",
    title: "多机位时码与场记",
    linked: false,
    when: "已选摄影机，且项目填写的机位数大于 1。",
    additions: "每机位列 1 套时码／锁相同步设备，全组列 1 块场记板。时码设备可按 timecode、Tentacle、Lockit 或 genlock 等关键词计入。统一帧率、快门和色彩需现场核对。",
  },
  {
    id: "set-support",
    title: "重型调度的现场支撑",
    linked: false,
    when: "识别到轨道车或摇臂。旧问卷选择完整规模时也检查。",
    additions: "检查 1 组苹果箱，包含全、半、四分之一和薄片组合。水平、垫平与安全附件按现场配置核对。",
  },
  {
    id: "camera-mount-verification",
    title: "实装卡口核验",
    linked: false,
    when: "已选摄影机与至少一项目录镜头，且参与比较的目录机身或镜头缺少明确卡口信息。",
    additions: "列 1 项实装卡口核验，记录机身、镜头和转接件的实际卡口。型号或品牌推断仅供核对参考。",
  },
  {
    id: "camera-lens-mount",
    title: "机身与镜头卡口兼容",
    linked: false,
    when: "已选摄影机，能从目录机身和镜头得到卡口；至少一种镜头卡口未出现在已识别的机身卡口中。",
    additions: "列 1 项转接与镜头支撑，标出镜头卡口及机身卡口。拍摄前检查法兰距、无限远、后组空间、跟焦齿位、承重和 15／19 mm 杆位。",
  },
  {
    id: "high-speed-workflow",
    title: "高帧率拍摄测试",
    linked: false,
    when: "升格帧率高于项目帧率，或旧问卷启用了高帧率拍摄方式。",
    additions: "列 1 项测试，核对曝光与频闪、实际存储、连续录制温度及目标帧率。曝光、灯具和存储容量按实测配置确定。",
  },
  {
    id: "dual-format-framing",
    title: "横竖双版本构图",
    linked: false,
    when: "项目的画幅设置为横竖双构图。",
    additions: "列 1 项横竖安全框与开放门测试，核对传感器读取方式、横竖及字幕安全区、导演监看，并截图留档。",
  },
];
