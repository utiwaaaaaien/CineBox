import type { CanonicalEquipmentRecord } from "./equipment-catalog.canonical";

export type EquipmentImage = {
  src?: string;
  alt: string;
  label: "官方型号图" | "官方系列图" | "分类示意";
  sourceUrl?: string;
  glyph: string;
};

const categoryGlyphs: Record<CanonicalEquipmentRecord["category"], string> = {
  摄影机: "CAM",
  镜头: "LENS",
  滤镜: "ND",
  摄影机附件: "ACC",
  监看: "MON",
  移动器材: "MOVE",
  灯光器材: "LGT",
  录音器材: "SND",
  其他: "KIT",
};

const official = {
  alexa35: {
    src: "/equipment/official/arri-alexa-35.jpg",
    sourceUrl: "https://www.arri.com/en/camera-systems/cameras/alexa-35",
  },
  alexaMiniLf: {
    src: "/equipment/official/arri-alexa-mini-lf.jpg",
    sourceUrl: "https://www.arri.com/en/camera-systems/cameras/alexa-mini-lf",
  },
  alexaMini: {
    src: "/equipment/official/arri-alexa-mini.jpg",
    sourceUrl: "https://www.arri.com/en/camera-systems/cameras/alexa-mini",
  },
  amira: {
    src: "/equipment/official/arri-amira.jpg",
    sourceUrl: "https://www.arri.com/en/camera-systems/cameras/amira",
  },
  arriLenses: {
    src: "/equipment/official/arri-cine-lenses.jpg",
    sourceUrl: "https://www.arri.com/en/camera-systems/cine-lenses/signature-lenses/signature-prime-lenses",
  },
  cookeS4: {
    src: "/equipment/official/cooke-s4i.jpg",
    sourceUrl: "https://cookeoptics.com/lenses/s4-i/",
  },
  ronin4d: {
    src: "/equipment/official/dji-ronin-4d.png",
    sourceUrl: "https://www.dji.com/cn/ronin-4d",
  },
  vRaptor: {
    src: "/equipment/official/red-v-raptor.jpg",
    sourceUrl: "https://www.reddigitalcinema.com/v-raptor",
  },
  komodoX: {
    src: "/equipment/official/red-komodo-x.jpg",
    sourceUrl: "https://www.reddigitalcinema.com/komodo-x",
  },
  aputure600d: {
    src: "/equipment/official/aputure-ls-600d-pro.png",
    sourceUrl: "https://aputure.com/en-US/products/ls-600d-pro",
  },
} as const;

function withOfficial(
  item: CanonicalEquipmentRecord,
  image: (typeof official)[keyof typeof official],
  label: EquipmentImage["label"],
): EquipmentImage {
  return {
    ...image,
    alt: `${item.name} ${label}`,
    label,
    glyph: categoryGlyphs[item.category],
  };
}

export function resolveEquipmentImage(item: CanonicalEquipmentRecord): EquipmentImage {
  const key = `${item.name} ${item.aliases.join(" ")}`.toLowerCase();

  if (item.id === "cam-alexa-35" || key.includes("alexa 35")) return withOfficial(item, official.alexa35, "官方型号图");
  if (item.id === "cam-alexa-mini-lf" || key.includes("alexa mini lf")) return withOfficial(item, official.alexaMiniLf, "官方型号图");
  if (item.id === "cam-alexa-mini" || key.includes("alexa mini")) return withOfficial(item, official.alexaMini, "官方型号图");
  if (item.id === "cam-arri-amira" || key.includes("amira")) return withOfficial(item, official.amira, "官方型号图");
  if (item.category === "镜头" && item.brand === "ARRI") return withOfficial(item, official.arriLenses, "官方系列图");
  if (item.brand === "Cooke" && /s4\/?i|s4i/.test(key)) return withOfficial(item, official.cookeS4, "官方系列图");
  if (item.brand === "DJI" && key.includes("ronin 4d")) return withOfficial(item, official.ronin4d, "官方型号图");
  if (item.brand === "RED" && key.includes("komodo")) return withOfficial(item, official.komodoX, "官方系列图");
  if (item.brand === "RED" && /v[ -]?raptor/.test(key)) return withOfficial(item, official.vRaptor, "官方系列图");
  if (item.brand === "Aputure" && /600d|600 d/.test(key)) return withOfficial(item, official.aputure600d, "官方型号图");

  return {
    alt: `${item.name} 分类示意`,
    label: "分类示意",
    glyph: categoryGlyphs[item.category],
  };
}

export const officialImageSources = Object.values(official);
