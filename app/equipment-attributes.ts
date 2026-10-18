import type { CanonicalEquipmentRecord } from "./equipment-catalog.canonical";

export type EquipmentRole =
  | "camera"
  | "lens"
  | "filter"
  | "power"
  | "media"
  | "matte-box"
  | "focus-control"
  | "monitor"
  | "video-transmission"
  | "tripod-head"
  | "tripod-legs"
  | "gimbal"
  | "slider"
  | "dolly"
  | "track"
  | "jib"
  | "lighting-fixture"
  | "lighting-support"
  | "audio"
  | "accessory";

export type EquipmentTrait =
  | "cinema"
  | "lightweight"
  | "high-speed"
  | "full-frame"
  | "integrated-stabilization"
  | "prime"
  | "zoom"
  | "anamorphic"
  | "macro"
  | "probe"
  | "vintage"
  | "clean"
  | "photo-mount"
  | "nd"
  | "cpl"
  | "clear-protection"
  | "diffusion"
  | "on-camera"
  | "director"
  | "wireless"
  | "heavy-duty"
  | "rgb"
  | "daylight"
  | "tungsten";

export type EquipmentAttributes = {
  role: EquipmentRole;
  traits: EquipmentTrait[];
  system: "ARRI" | "SONY" | "RED" | "DJI" | "Canon" | "Panasonic" | "generic";
  lensMount: "PL" | "LPL" | "E" | "RF" | "EF" | "L" | "DL" | "MFT" | "fixed" | "unknown";
  filterSize: "4x5.65" | "6x6" | "138mm" | "round" | "unknown";
  confidence: "high" | "inferred";
};

const systemBrands: Record<string, EquipmentAttributes["system"]> = {
  ARRI: "ARRI",
  SONY: "SONY",
  RED: "RED",
  DJI: "DJI",
  Canon: "Canon",
  Panasonic: "Panasonic",
};

function textOf(item: CanonicalEquipmentRecord) {
  return `${item.brand} ${item.name} ${item.subcategory} ${(item.aliases ?? []).join(" ")}`;
}

function roleFromCategory(item: CanonicalEquipmentRecord, text: string): EquipmentRole {
  if (item.category === "摄影机") return "camera";
  if (item.category === "镜头") return "lens";
  if (item.category === "滤镜") return "filter";
  if (item.category === "录音器材") return "audio";
  if (item.category === "监看") {
    if (/图传|transmi|wireless\s*(?:video|transmitter)|storm\s*2000/i.test(text)) return "video-transmission";
    return "monitor";
  }
  if (item.category === "灯光器材") {
    if (/stand|脚|架|clamp|卡具|索具|frame|框架|蝶布|scrim|silk|grid\s*cloth|配电|power\s*supply|cable/i.test(text)) return "lighting-support";
    return "lighting-fixture";
  }
  if (item.category === "移动器材") {
    if (/摄影车|道莱车|轨道车/i.test(text) || (/dolly/i.test(text) && !/track|轨/i.test(text))) return "dolly";
    if (/track|直轨|弯轨|轨道/i.test(text)) return "track";
    if (/slider|滑轨/i.test(text)) return "slider";
    if (/jib|crane|摇臂|伸缩炮|howmoco/i.test(text)) return "jib";
    if (/ronin|rs\s*[2345]|gimbal|稳定器|遥控头|remote\s*head/i.test(text)) return "gimbal";
    if (/head|云台|2575|2065|teris|图瑞斯/i.test(text)) return "tripod-head";
    if (/tripod|脚架|高低脚|baby\s*legs|tall\s*legs/i.test(text)) return "tripod-legs";
    return "accessory";
  }
  if (/电池|battery|charger|充电|v-?mount|gold\s*mount|tb\s*50/i.test(text)) return "power";
  if (/codex|prossd|ssd|cfexpress|cfast|data\s*pack|card|reader|读卡/i.test(text)) return "media";
  if (/matte\s*box|lmb|smb|mb-?14|遮光斗/i.test(text)) return "matte-box";
  if (/follow\s*focus|wireless\s*focus|wcu|hi-?5|focus\s*pro|跟焦|cforce|nucleus/i.test(text)) return "focus-control";
  return "accessory";
}

function uniqueTraits(traits: EquipmentTrait[]) {
  return [...new Set(traits)];
}

export function classifyEquipment(item: CanonicalEquipmentRecord): EquipmentAttributes {
  const text = textOf(item);
  const role = roleFromCategory(item, text);
  const traits: EquipmentTrait[] = [];

  if (/电影摄影机|数字电影|cinema|alexa|venice|burano|v-?raptor|komodo|ronin\s*4d/i.test(text)) traits.push("cinema");
  if (/轻量|mini\b|fx[2356]|komodo|mirrorless|微单|无反|rs\s*[2345]/i.test(text)) traits.push("lightweight");
  if (/高速|high\s*speed|phantom|freefly\s*(?:wave|ember)|v-?raptor|alexa\s*35\s*xtreme/i.test(text)) traits.push("high-speed");
  if (/full\s*frame|large\s*format|大画幅|全画幅|65mm|\bvv\b|mini\s*lf|alexa\s*(?:lf|265)|venice|burano|fx[23569]|r5c?/i.test(text)) traits.push("full-frame");
  if (/ronin\s*4d/i.test(text)) traits.push("integrated-stabilization");

  if (role === "lens") {
    if (/变形|anamorphic|atlas|mercury|orion|hawk/i.test(text)) traits.push("anamorphic");
    if (/微距|macro|gnosis/i.test(text)) traits.push("macro");
    if (/探针|probe|x-?tract|laowa.*24mm/i.test(text)) traits.push("probe");
    if (/变焦|zoom|\d+\s*[-–]\s*\d+\s*mm|16-35|24-70|70-200|optimo|angenieux/i.test(text)) traits.push("zoom");
    else traits.push("prime");
    if (/super\s*speed|speed\s*panchro|canon\s*fd|vintage|复古|panchro.*classic/i.test(text)) traits.push("vintage");
    if (/supreme|signature|master\s*prime|summilux|s7\/i|athena|sigma.*cine/i.test(text)) traits.push("clean");
    if (/\bfe\b|\bgm\b|photo|摄影|16-35|24-70|70-200/i.test(text)) traits.push("photo-mount", "lightweight");
  }

  if (role === "filter") {
    if (/\b(?:ir)?nd\b|减光|灰片/i.test(text)) traits.push("nd");
    if (/cpl|polariz|偏振/i.test(text)) traits.push("cpl");
    if (/(?:filter\s*)?clear(?:\s*filter)?|保护镜/i.test(text) && !/clear\s*satin/i.test(text)) traits.push("clear-protection");
    if (/mist|diffusion|soft|glimmer|satin|pearlescent|柔/i.test(text)) traits.push("diffusion");
  }

  if (role === "monitor") {
    if (/5(?:\.\d)?[′'"寸]|7(?:\.\d)?[′'"寸]|smallhd|机头|焦点|high-?bright/i.test(text)) traits.push("on-camera");
    if (/17|18|19|24|25|dm\s*240|导演|client/i.test(text)) traits.push("director");
    if (/wireless|无线/i.test(text)) traits.push("wireless");
  }
  if (role === "video-transmission") traits.push("wireless");
  if (["dolly", "track", "jib", "tripod-head", "tripod-legs"].includes(role) && /heavy|h\/d|2575|ronford|重型|primo|hybrid/i.test(text)) traits.push("heavy-duty");
  if (role === "lighting-fixture") {
    if (/rgb|skypanel|orbiter|titan|60c|300c|600c/i.test(text)) traits.push("rgb");
    if (/hmi|daylight|600d|1200d|evoke/i.test(text)) traits.push("daylight");
    if (/tungsten|钨丝|fresnel/i.test(text) && !/hmi/i.test(text)) traits.push("tungsten");
  }

  let lensMount: EquipmentAttributes["lensMount"] = "unknown";
  // Explicit mounts take precedence over brand heuristics; series sold in several mounts stay unknown.
  const identity = `${item.name} ${item.subcategory}`;
  if (item.lensMount) lensMount = item.lensMount;
  else if (/\blpl\b/i.test(identity)) lensMount = "LPL";
  else if (/\brf\b|RF口/i.test(identity) || ["cam-canon-c80", "cam-canon-r5m2"].includes(item.id)) lensMount = "RF";
  else if (/\bef\b|EF口/i.test(identity)) lensMount = "EF";
  else if (/E口|e-mount/i.test(identity)) lensMount = "E";
  else if (/\bpl\b|PL口/i.test(identity)) lensMount = "PL";
  else if (/待确认/.test(identity) || /^lens-cooke-sp3-|^lens-nisi-athena-/.test(item.id) || item.id === "cam-freefly-ember-s5k") lensMount = "unknown";
  else if (/alexa|arri|red|venice|burano|电影镜头|atlas|mercury|supreme|signature\s*prime|master\s*prime|super\s*speed|angenieux|cooke/i.test(text)) lensMount = "PL";
  else if (/sony|\bfe\b|e-?mount/i.test(text)) lensMount = "E";
  else if (/\brf\b|canon\s*r5/i.test(text)) lensMount = "RF";
  else if (/\bef\b|5d\s*mark/i.test(text)) lensMount = "EF";
  else if (/lumix|panasonic|\bl-mount\b/i.test(text)) lensMount = "L";
  else if (/ronin\s*4d|\bdl\b/i.test(text)) lensMount = "DL";

  let filterSize: EquipmentAttributes["filterSize"] = "unknown";
  if (/4\s*[×x*]\s*5[.,]\s*6(?:5)?|4x5\.6|4x5\.65/i.test(text)) filterSize = "4x5.65";
  else if (/6(?:\.6)?\s*[×x*]\s*6(?:\.6)?|6x6/i.test(text)) filterSize = "6x6";
  else if (/138\s*mm/i.test(text)) filterSize = "138mm";
  else if (/\b\d{2,3}\s*mm\b|round|圆形/i.test(text) && role === "filter") filterSize = "round";

  return {
    role,
    traits: uniqueTraits(traits),
    system: systemBrands[item.brand] ?? "generic",
    lensMount,
    filterSize,
    confidence: item.verified || role !== "accessory" ? "high" : "inferred",
  };
}

export function hasEquipmentTrait(item: CanonicalEquipmentRecord, trait: EquipmentTrait) {
  return classifyEquipment(item).traits.includes(trait);
}
