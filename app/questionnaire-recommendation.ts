import type { CanonicalEquipmentRecord } from "./equipment-catalog.canonical";
import { classifyEquipment, type EquipmentRole, type EquipmentTrait } from "./equipment-attributes.ts";

export type QuestionnaireRecommendationProject = {
  type: string;
  scale: string;
  cameraCount: number;
  cameraBrand: string;
  lensStyle: string;
  monitoring: string;
  lightNeed: string;
  screenFormat: string;
  captureStyle: string[];
  narrativeViewpoint?: string;
  aspectRatio?: string;
  visualTone?: string;
  contrastStyle?: string;
  movementIntent?: string;
  sceneConditions?: string[];
  baseFps?: number;
  highSpeedFps?: number;
  resolution?: string;
  recordingFormat?: string;
  shootingRatio?: number;
  hoursPerDay?: number;
  powerAccess?: string;
};

export type RecommendationSeedItem = {
  id: string;
  reason: string;
};

export type HistoricalSeedProfile = {
  label: string;
  projectName?: string;
  items: string[];
};

function uniqueSeed(items: RecommendationSeedItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function buildHistoricalProjectSeed(profile: HistoricalSeedProfile): RecommendationSeedItem[] {
  const sourceLabel = profile.projectName ? `${profile.label} · ${profile.projectName}` : profile.label;
  return profile.items.map((id) => ({ id, reason: `历史项目复用：${sourceLabel}` }));
}

type EquipmentIntent = {
  role: EquipmentRole;
  traits?: EquipmentTrait[];
  brand?: string;
  preferredIds?: string[];
};

function selectEquipment(
  catalog: readonly CanonicalEquipmentRecord[],
  project: QuestionnaireRecommendationProject,
  intent: EquipmentIntent,
) {
  const targetTier = project.scale === "轻量" ? 2 : project.scale === "完整" ? 5 : 3;
  const preferred = new Map((intent.preferredIds ?? []).map((id, index, list) => [id, (list.length - index) * 30]));
  return catalog
    .filter((item) => !/待确认/.test(item.name))
    .map((item) => {
      const attributes = classifyEquipment(item);
      if (attributes.role !== intent.role) return { item, score: Number.NEGATIVE_INFINITY };
      let score = preferred.get(item.id) ?? 0;
      score += item.verified ? 5 : 0;
      score += Math.max(0, 7 - Math.abs(item.costTier - targetTier) * 2);
      if (intent.brand) score += item.brand.toLowerCase() === intent.brand.toLowerCase() ? 18 : -8;
      for (const trait of intent.traits ?? []) score += attributes.traits.includes(trait) ? 10 : -6;
      if (/组|kit|set/i.test(`${item.name} ${item.subcategory}`) && intent.role === "lens") score += 8;
      return { item, score };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, "zh-CN"))[0]?.item;
}

function selectId(
  catalog: readonly CanonicalEquipmentRecord[],
  project: QuestionnaireRecommendationProject,
  intent: EquipmentIntent,
) {
  return selectEquipment(catalog, project, intent)?.id;
}

function defined(ids: Array<string | undefined>) {
  return ids.filter((id): id is string => Boolean(id));
}

export function buildQuestionnaireOnlySeed(
  project: QuestionnaireRecommendationProject,
  catalog: readonly CanonicalEquipmentRecord[],
  cameraOverrideId?: string,
): RecommendationSeedItem[] {
  const items: RecommendationSeedItem[] = [];
  const add = (ids: string[], reason: string) => ids.forEach((id) => items.push({ id, reason }));
  const sceneConditions = project.sceneConditions ?? [];
  const highSpeedFps = project.highSpeedFps ?? 0;
  const isHighSpeed = project.captureStyle.includes("高帧率") || highSpeedFps > (project.baseFps ?? 25);
  const needsLightweightSystem =
    project.screenFormat === "竖屏" ||
    sceneConditions.includes("狭小空间") ||
    project.movementIntent === "人物跟随";

  const cameraPreferences: Record<string, string[]> = {
    ARRI: project.scale === "完整" ? ["cam-alexa-35", "cam-alexa-mini-lf", "cam-alexa-lf"] : ["cam-alexa-mini", "cam-arri-amira"],
    SONY: project.scale === "完整" ? ["cam-sony-burano", "cam-sony-venice2", "cam-sony-venice"] : project.scale === "轻量" ? ["cam-sony-fx3", "cam-sony-fx6"] : ["cam-sony-fx6", "cam-sony-fx9", "cam-sony-burano"],
    RED: ["cam-red-vraptor", "cam-red-komodo", "cam-red-monstro"],
    DJI: ["cam-ronin4d", "cam-dji-ronin4d-8k"],
  };
  let preferredCameras = cameraPreferences[project.cameraBrand];
  const cameraTraits: EquipmentTrait[] = ["cinema"];
  if (!preferredCameras) {
    if (isHighSpeed) {
      preferredCameras = ["cam-red-vraptor", "cam-phantom-flex4k", "cam-freefly-wave"];
      cameraTraits.push("high-speed");
    } else if (project.captureStyle.includes("微距产品")) {
      preferredCameras = ["cam-ronin4d", "cam-dji-ronin4d-8k"];
      cameraTraits.push("integrated-stabilization");
    } else if (needsLightweightSystem || ["企业宣传片", "艺人视频", "纪录片"].includes(project.type)) {
      preferredCameras = project.scale === "完整" ? ["cam-sony-burano", "cam-sony-fx9"] : project.scale === "轻量" ? ["cam-sony-fx3", "cam-sony-fx6"] : ["cam-sony-fx6", "cam-sony-fx9"];
      cameraTraits.push("lightweight");
    } else if (project.type === "TVC" && project.scale !== "完整") {
      preferredCameras = ["cam-ronin4d", "cam-alexa-mini", "cam-sony-fx6"];
    } else {
      preferredCameras = project.scale === "完整" ? ["cam-alexa-35", "cam-alexa-mini-lf"] : ["cam-alexa-mini", "cam-arri-amira"];
    }
  }
  const cameraId = cameraOverrideId && catalog.some((item) => item.id === cameraOverrideId && item.category === "摄影机")
    ? cameraOverrideId
    : selectId(catalog, project, {
        role: "camera",
        traits: cameraTraits,
        brand: project.cameraBrand === "自动匹配" ? undefined : project.cameraBrand,
        preferredIds: preferredCameras,
      });
  if (!cameraId) return [];
  const cameraReason = cameraOverrideId
    ? `联动重算：以 ${catalog.find((item) => item.id === cameraId)?.name ?? "所选机身"} 为系统核心`
    : project.cameraBrand === "自动匹配"
      ? `创作与执行匹配：${project.type} / ${project.scale}${isHighSpeed ? ` / ${highSpeedFps || "高"}fps` : ""}${needsLightweightSystem ? " / 轻量调度" : ""}`
      : `问卷指定品牌：${project.cameraBrand}`;
  add([cameraId], cameraReason);

  const lensRules: Record<string, { traits: EquipmentTrait[]; ids: string[]; count?: number }> = {
    现代干净: { traits: ["prime", "clean"], ids: ["lens-zeiss-supreme", "lens-nisi-athena"] },
    复古柔和: { traits: ["prime", "vintage"], ids: ["lens-zeiss-super-speed"] },
    变形宽银幕: { traits: ["anamorphic"], ids: ["lens-atlas-mercury"] },
    轻量变焦: { traits: ["zoom", "photo-mount", "lightweight"], ids: ["lens-sony-1635", "lens-sony-2470", "lens-sony-70200"], count: project.scale === "轻量" ? 2 : 3 },
    微距特殊: { traits: ["macro"], ids: ["lens-dzo-gnosis", "lens-dzo-xtract", "lens-nisi-athena"], count: 3 },
  };
  if (project.lensStyle !== "自动匹配") {
    const rule = lensRules[project.lensStyle];
    if (rule) {
      const selected = rule.count && rule.count > 1
        ? rule.ids.filter((id) => catalog.some((item) => item.id === id)).slice(0, rule.count)
        : defined([selectId(catalog, project, { role: "lens", traits: rule.traits, preferredIds: rule.ids })]);
      add(selected, `问卷镜头语言：${project.lensStyle} · 按焦段/光学属性匹配`);
    }
  } else if (project.aspectRatio === "2.39:1") {
    add(["lens-atlas-mercury"], "创作简报：2.39:1 画幅 · 变形宽银幕候选");
  } else if (project.visualTone === "低饱和柔和") {
    add(defined([selectId(catalog, project, { role: "lens", traits: ["prime", "vintage"], preferredIds: ["lens-zeiss-super-speed"] })]), "创作简报：低饱和柔和 · 复古定焦候选");
  } else if (classifyEquipment(catalog.find((item) => item.id === cameraId)!).lensMount === "E") {
    add(["lens-sony-1635", "lens-sony-2470", ...(project.scale === "轻量" ? [] : ["lens-sony-70200"])], "问卷自动镜头：E 口轻量变焦覆盖");
  } else if (cameraId === "cam-ronin4d") {
    add(defined([selectId(catalog, project, { role: "lens", traits: ["prime", "lightweight"], preferredIds: ["lens-nisi-athena"] })]), "问卷自动镜头：Ronin 4D 轻量电影定焦（需确认 DL/E 卡口转接）");
  } else {
    add(defined([
      selectId(catalog, project, { role: "lens", traits: ["prime", "clean"], preferredIds: ["lens-zeiss-supreme", "lens-zeiss-super-speed"] }),
      selectId(catalog, project, { role: "lens", traits: ["zoom"], preferredIds: ["lens-angenieux-ez1", "eq-angenieux-angenieux-type-ez-2-15-40mm-t2-0-镜头"] }),
    ]), "问卷自动镜头：PL 电影定焦组 + 变焦补位");
  }

  const movementRules: Record<string, () => string[]> = {
    稳定器: () => defined([selectId(catalog, project, { role: "gimbal", traits: project.scale === "轻量" ? ["lightweight"] : [], preferredIds: project.scale === "完整" ? ["grip-ronin2"] : ["grip-rs4"] })]),
    滑轨: () => defined([selectId(catalog, project, { role: "slider", preferredIds: ["grip-slider", "eq-ronford-baker-ronford-slider-移动器材"] })]),
    轨道车: () => defined([
      selectId(catalog, project, { role: "dolly", traits: project.scale === "完整" ? ["heavy-duty"] : [], preferredIds: ["grip-dolly", "eq-gfm-gf-primo-dolly-移动器材"] }),
      selectId(catalog, project, { role: "track", preferredIds: ["grip-track", "eq-gfm-gf-stee-dolly-track-straight-620mm-6ft-gf-移动器材"] }),
    ]),
    伸缩摇臂: () => defined([selectId(catalog, project, { role: "jib", preferredIds: ["grip-howmoco"] })]),
    微距产品: () => defined(["lens-dzo-gnosis", "lens-dzo-xtract", "accessory-focus-pro", selectId(catalog, project, { role: "slider", preferredIds: ["grip-slider"] })]),
    弱光夜景: () => defined([selectId(catalog, project, { role: "lighting-fixture", traits: ["daylight"], preferredIds: ["light-arri-m18", "light-aputure-600d-pro"] })]),
    高帧率: () => [],
    竖屏: () => defined([selectId(catalog, project, { role: "gimbal", traits: ["lightweight"], preferredIds: ["grip-rs4"] })]),
  };
  project.captureStyle.forEach((style) => add(movementRules[style]?.() ?? [], `问卷拍摄方式：${style} · 按器材功能属性匹配`));
  if (project.screenFormat === "竖屏") add(movementRules.竖屏(), "问卷画面方向：竖屏安装");
  if (project.movementIntent === "机械精确" && !project.captureStyle.includes("滑轨")) {
    add(movementRules.滑轨(), "创作简报：机械精确运动 · 精细滑轨候选");
  }
  if (project.visualTone === "低饱和柔和") add(["filter-bpm"], "创作简报：低饱和柔和 · 柔化滤镜测试候选");

  if (project.monitoring === "完整监看") {
    add(defined([
      selectId(catalog, project, { role: "monitor", traits: ["director"], preferredIds: ["video-dm240"] }),
      selectId(catalog, project, { role: "monitor", traits: ["on-camera"], preferredIds: ["video-smallhd702"] }),
      selectId(catalog, project, { role: "monitor", traits: ["wireless"], preferredIds: ["video-vaxis072"] }),
    ]), "问卷监看规模：导演监看 + 机头/焦点监看 + 无线监看");
  }
  if (project.lightNeed === "轻量灯光") add(defined([
    selectId(catalog, project, { role: "lighting-fixture", traits: ["rgb"], preferredIds: ["light-amaran300c"] }),
    selectId(catalog, project, { role: "lighting-fixture", traits: ["lightweight"], preferredIds: ["light-nanlite60c"] }),
  ]), "问卷灯光需求：轻量 RGB 主灯 + 便携补光");
  if (project.lightNeed === "完整灯光") add(defined([
    selectId(catalog, project, { role: "lighting-fixture", traits: ["rgb"], preferredIds: ["light-amaran300c"] }),
    selectId(catalog, project, { role: "lighting-fixture", preferredIds: ["light-nanlite60c"] }),
    selectId(catalog, project, { role: "lighting-fixture", traits: ["daylight"], preferredIds: ["light-arri-m18", "eq-arri-arri-m40-hmi-灯光器材"] }),
  ]), "问卷灯光需求：彩色、便携与大功率日光系统分工");
  if (
    project.lightNeed !== "不含灯光" &&
    (sceneConditions.includes("夜外") || isHighSpeed)
  ) {
    add(defined([
      selectId(catalog, project, { role: "lighting-fixture", traits: ["daylight"], preferredIds: ["light-aputure-600d-pro", "light-arri-m18"] }),
    ]), `技术条件：${sceneConditions.includes("夜外") ? "夜外" : ""}${sceneConditions.includes("夜外") && isHighSpeed ? " + " : ""}${isHighSpeed ? `${highSpeedFps || "高"}fps` : ""} · 预留高输出灯具`);
  }

  return uniqueSeed(items);
}
