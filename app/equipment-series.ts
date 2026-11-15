import type { CanonicalEquipmentRecord } from "./equipment-catalog.canonical";
import { compareEquipmentFocalLength } from "./equipment-focal-length.ts";

export type EquipmentSeries = {
  id: string;
  name: string;
  brand: string;
  category: CanonicalEquipmentRecord["category"];
  items: CanonicalEquipmentRecord[];
};

type SeriesRule = {
  category: CanonicalEquipmentRecord["category"];
  match: RegExp;
  name: string;
};

const seriesRules: SeriesRule[] = [
  { category: "镜头", match: /optimo anamorphic a2s/i, name: "Optimo Anamorphic A2S" },
  { category: "镜头", match: /optimo spherical zoom/i, name: "Optimo Spherical Zoom" },
  { category: "镜头", match: /optimo ultra/i, name: "Optimo Ultra" },
  { category: "镜头", match: /optimo style/i, name: "Optimo Style" },
  { category: "镜头", match: /optimo prime/i, name: "Optimo Prime" },
  { category: "镜头", match: /(?:type )?ez[- ]?[123]/i, name: "Type EZ" },
  { category: "镜头", match: /master anamorphic/i, name: "Master Anamorphic" },
  { category: "镜头", match: /master prime/i, name: "Master Prime" },
  { category: "镜头", match: /signature prime/i, name: "Signature Prime" },
  { category: "镜头", match: /signature zoom/i, name: "Signature Zoom" },
  { category: "镜头", match: /ultra prime/i, name: "Ultra Prime" },
  { category: "镜头", match: /(?:fujinon )?alura/i, name: "Alura Zoom" },
  { category: "镜头", match: /atlas.*orion|orion.*atlas/i, name: "Orion Anamorphic" },
  { category: "镜头", match: /atlas.*mercury|mercury.*atlas/i, name: "Mercury Anamorphic" },
  { category: "镜头", match: /canon cn-e/i, name: "CN-E Cinema Prime" },
  { category: "镜头", match: /canon fd ff/i, name: "FD Full Frame" },
  { category: "镜头", match: /canon ef /i, name: "EF L Series" },
  { category: "镜头", match: /anamorphic.*full frame plus|anamorphic\/i ff/i, name: "Anamorphic/i Full Frame Plus" },
  { category: "镜头", match: /anamorphic\/i sf/i, name: "Anamorphic/i Special Flair" },
  { category: "镜头", match: /anamorphic\/i/i, name: "Anamorphic/i" },
  { category: "镜头", match: /cooke s4\/?i|s4i/i, name: "S4/i" },
  { category: "镜头", match: /cooke s5\/?i|s5i/i, name: "S5/i" },
  { category: "镜头", match: /cooke s7\/?i|s7i/i, name: "S7/i Full Frame Plus" },
  { category: "镜头", match: /panchro.*classic/i, name: "Panchro/i Classic" },
  { category: "镜头", match: /speed panchro/i, name: "Speed Panchro" },
  { category: "镜头", match: /cooke sp3/i, name: "SP3" },
  { category: "镜头", match: /summilux[- ]?c/i, name: "Summilux-C" },
  { category: "镜头", match: /summicron[- ]?c/i, name: "Summicron-C" },
  { category: "镜头", match: /leica thalia|leitz thalia/i, name: "Thalia" },
  { category: "镜头", match: /leitz prime|leica prime/i, name: "Leitz Prime" },
  { category: "镜头", match: /hawk.*class[- ]?x/i, name: "Class-X Anamorphic" },
  { category: "镜头", match: /hawk.*v[- ]?lite/i, name: "V-Lite Anamorphic" },
  { category: "镜头", match: /hawk.*vantage one/i, name: "Vantage One" },
  { category: "镜头", match: /zeiss supreme prime/i, name: "Supreme Prime" },
  { category: "镜头", match: /zeiss.*cp\.?3/i, name: "Compact Prime CP.3" },
  { category: "镜头", match: /zeiss.*cp\.?2/i, name: "Compact Prime CP.2" },
  { category: "镜头", match: /zeiss.*super speed/i, name: "Super Speed" },
  { category: "镜头", match: /zeiss.*standard speed/i, name: "Standard Speed" },
  { category: "镜头", match: /sigma.*ff.*high speed|sigma cine.*prime/i, name: "FF High Speed Prime" },
  { category: "镜头", match: /dzofilm.*(?:vespid|玄蜂)/i, name: "玄蜂" },
  { category: "镜头", match: /dzofilm.*pictor/i, name: "Pictor Zoom" },
  { category: "镜头", match: /dzofilm.*arles/i, name: "Arles Prime" },
  { category: "镜头", match: /laowa.*proteus/i, name: "Proteus Anamorphic" },
  { category: "镜头", match: /laowa.*ranger/i, name: "Ranger Zoom" },
  { category: "镜头", match: /laowa.*macro probe zoom/i, name: "MACRO PROBE ZOOM" },
  { category: "摄影机", match: /dji.*mavic/i, name: "Mavic" },
  { category: "摄影机", match: /dji.*osmo action/i, name: "Osmo Action" },
  { category: "摄影机", match: /dji.*osmo pocket/i, name: "Osmo Pocket" },
  { category: "移动器材", match: /dji.*\brs\b/i, name: "RS" },
  { category: "镜头", match: /thypoch.*(?:simera-c|瞬)/i, name: "瞬" },
  { category: "镜头", match: /sirui.*saturn/i, name: "Saturn Anamorphic" },
  { category: "镜头", match: /7artisans.*(?:flora|繁花)/i, name: "繁花" },
  { category: "镜头", match: /nisi.*athena.*(?:detuned|特调)/i, name: "Athena Tuned" },
  { category: "镜头", match: /nisi.*(?:athena|雅典娜)/i, name: "雅典娜" },
  { category: "摄影机", match: /arri alexa/i, name: "ALEXA 系列" },
  { category: "摄影机", match: /sony\s+(?:ilme-|pxw-)?fx\d/i, name: "Cinema Line FX 系列" },
  { category: "摄影机", match: /canon eos c\d/i, name: "Cinema EOS 系列" },
  { category: "摄影机", match: /red.*v[- ]?raptor/i, name: "V-RAPTOR 系列" },
  { category: "摄影机", match: /red.*komodo/i, name: "KOMODO 系列" },
  { category: "灯光器材", match: /aputure.*ls[- ]?\d|爱图仕.*ls/i, name: "光风暴" },
  { category: "灯光器材", match: /nanlite.*forza|南光.*forza/i, name: "Forza 系列" },
  { category: "监看", match: /tvlogic.*lvm/i, name: "LVM 监视器系列" },
  { category: "监看", match: /vaxis.*(?:storm|暴风)/i, name: "暴风" },
];

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildEquipmentSeries(items: readonly CanonicalEquipmentRecord[]): EquipmentSeries[] {
  const groups = new Map<string, EquipmentSeries>();

  for (const item of items) {
    const haystack = `${item.name} ${(item.aliases ?? []).join(" ")}`;
    const rule = seriesRules.find((candidate) => candidate.category === item.category && candidate.match.test(haystack));
    const name = (item.id.startsWith("v63-") && item.series) || rule?.name;
    if (!name) continue;

    const key = `${item.category}:${item.brand}:${name}`;
    const current = groups.get(key);
    if (current) current.items.push(item);
    else {
      groups.set(key, {
        id: slug(key),
        name,
        brand: item.brand,
        category: item.category,
        items: [item],
      });
    }
  }

  return [...groups.values()]
    .filter((series) => series.items.length > 1)
    .map((series) => ({
      ...series,
      items: series.items.sort((a, b) =>
        (series.category === "镜头" ? compareEquipmentFocalLength(a, b) : 0) ||
        a.name.localeCompare(b.name, "zh-CN", { numeric: true }),
      ),
    }))
    .sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name, "zh-CN"));
}
