import { equipmentCardData } from "./equipment-card-data.generated.ts";

type FocalEquipment = {
  id: string;
  category: string;
  name: string;
  model?: string;
  englishName?: string;
};

const focalLabels = new Set(["焦距", "焦距范围", "焦段范围", "库存焦段"]);
const focalCache = new WeakMap<FocalEquipment, [number, number] | null>();

function parseFocalLengths(value: string) {
  const text = value.normalize("NFKC");
  const withUnit = text.match(/(?<![\d.a-z])(\d+(?:\.\d+)?(?:\s*mm)?(?:\s*[-‐‑–—~〜至到/、]\s*\d+(?:\.\d+)?(?:\s*mm)?)*)\s*(?:r|-n)?\s*mm\b/i);
  const rangeOrSet = text.match(/(?<![\d.])(\d+(?:\.\d+)?(?:\s*[/、]\s*\d+(?:\.\d+)?){2,})(?![\d.])/i) ??
    text.match(/(?<![\d.a-z])(\d+(?:\.\d+)?\s*[-‐‑–—~〜至到]\s*\d+(?:\.\d+)?)(?![\d.a-z])/i);
  const withApertureOrType = text.match(/(?<![\d.a-z])(\d+(?:\.\d+)?)(?:r)?(?=\s*(?:[ft]\d|macro\b|tilt-shift\b|移轴|微距))/i) ??
    text.match(/\bfd\s*(\d+)(?=\/\d)/i);
  const lengths = (withUnit ?? rangeOrSet ?? withApertureOrType)?.[1]
    .match(/\d+(?:\.\d+)?/g)?.map(Number);
  return lengths?.length ? [Math.min(...lengths), Math.max(...lengths)] as [number, number] : null;
}

function equipmentFocalLength(item: FocalEquipment) {
  if (focalCache.has(item)) return focalCache.get(item);

  // Series-level specs can describe the whole product line rather than the actual kit.
  const cardFocalLength = equipmentCardData[item.id]?.technicalSpecs.find(
    (spec) => spec.scope === "model" && focalLabels.has(spec.label),
  )?.value;
  const focalLength = [cardFocalLength, item.model, item.name, item.englishName]
    .filter((value): value is string => !!value)
    .map(parseFocalLengths)
    .find((value) => value !== null) ?? null;
  focalCache.set(item, focalLength);
  return focalLength;
}

export function compareEquipmentFocalLength(left: FocalEquipment, right: FocalEquipment) {
  const a = equipmentFocalLength(left);
  const b = equipmentFocalLength(right);
  if (!a || !b) return Number(!!b) - Number(!!a);
  return a[0] - b[0] || a[1] - b[1];
}

export function sortEquipmentByFocalLength<T extends FocalEquipment>(items: T[]) {
  const lenses = items.filter((item) => item.category === "镜头").sort(compareEquipmentFocalLength);
  let lensIndex = 0;
  return items.map((item) => item.category === "镜头" ? lenses[lensIndex++] : item);
}
