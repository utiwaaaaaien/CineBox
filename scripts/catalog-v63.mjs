import fs from "node:fs";
import { identityKey, mergeEquipment } from "./catalog-naming.mjs";

const read = name => JSON.parse(fs.readFileSync(new URL(`../data/catalog/${name}-v6.3.json`, import.meta.url), "utf8"));
const accessories = read("accessories");
const lenses = read("ying-ding");
export const classification = read("classification");
const lensEntries = lenses.rows.map(row => {
  const { series, focal, aperture, mount, front, close, page, opticalModel } = row;
  const model = [opticalModel, focal, aperture, mount && /^[A-Z]+$/.test(mount) ? mount : ""].filter(Boolean).join(" ");
  const englishName = `Ying Ding ${series} ${model} Cine Mod`;
  return {
    id: row.id, brand: "Ying Ding", brandZh: "影鼎", brandEn: "Ying Ding",
    series, model, name: `影鼎 Ying Ding ${series} ${model}`, englishName,
    category: "镜头", subcategory: `风格化改装 · ${row.variant}镜头`, unit: "支", costTier: 2,
    lensMount: ["PL", "LPL", "EF", "E"].includes(mount) ? mount : "unknown",
    aliases: [englishName, `北京影鼎 ${series} ${focal}`, `影鼎 ${series} 轻量化改装 ${focal}`],
    source: `${lenses.source}#page=${page}`, checkedAt: lenses.checkedAt, language: "zh-CN", provenance: "inventory",
    metrics: [["卡口（原表）", mount], ["前口径", front], ["最近对焦", close]].filter(([, value]) => value),
    notes: ["影鼎改装配置；多卡口为来源所列选项，实际装机需确认。", ...(row.notes ?? [])],
  };
});

const entries = [
  ...accessories.rows.map(row => ({
    ...row, brandEn: row.brand,
    name: [row.brandZh, row.brand, row.series, row.model].filter(Boolean).join(" "),
    englishName: [row.brand, row.series, row.model].filter(Boolean).join(" "),
    costTier: 2, checkedAt: accessories.checkedAt, provenance: "manufacturer",
  })),
  ...lensEntries,
];
export const specialtyCatalog = entries.map(({ source, language, checkedAt, metrics, provenance, notes, ...row }) => {
  if (metrics.length > 3) throw new Error(`Too many specialty card metrics: ${row.id}`);
  const verified = provenance === "manufacturer";
  const namingStatus = verified ? "official-model" : "pending";
  return {
    ...row, verified, published: true, namingStatus, reviewedAt: checkedAt,
    inventoryAvailability: "unconfirmed",
    references: [{ url: source, scope: verified ? "model" : "inventory", language, checkedAt }],
    identityBasis: verified ? namingStatus : "specific-inventory",
    releaseReason: verified ? "厂商资料确认该型号或配置" : "影鼎参数表记录的具体改装配置；未推断原厂规格或实时库存",
    reviewNotes: notes ?? [],
  };
});
export const specialtyCardEvidence = entries.map(({ id, source, checkedAt, provenance, metrics }) => ({
  id, checkedAt,
  technicalSpecs: metrics.map(([label, value]) => ({ label, value, source, provenance, scope: "model" })),
  ...(metrics.length < 3 ? { missing: ["来源未确认其余可展示指标"], reviewStatus: "source-unavailable" } : {}),
}));

export function reviewClassification(rows) {
  const byId = new Map(rows.map(row => [row.id, row]));
  const seen = new Set();
  for (const { id, category, subcategory } of classification.reclassifications) {
    const row = byId.get(id);
    if (!row || seen.has(id)) throw new Error(`Invalid classification target: ${id}`);
    seen.add(id);
    Object.assign(row, { category, subcategory });
  }
  const preferred = new Set(classification.merges.map(({ into }) => into));
  const sources = new Set();
  for (const { from, into } of classification.merges) {
    const source = byId.get(from), target = byId.get(into);
    if (!source || !target || !source.published || !target.published || sources.has(from) || preferred.has(from)) {
      throw new Error(`Invalid reviewed duplicate: ${from} → ${into}`);
    }
    sources.add(from);
    if (identityKey({ ...source, category: target.category }) !== identityKey(target)) {
      throw new Error(`Reviewed duplicate changed: ${from} → ${into}`);
    }
    Object.assign(source, { category: target.category, subcategory: target.subcategory });
  }
  const result = mergeEquipment(rows, preferred);
  for (const { from, into, reason } of classification.merges) {
    if (result.redirects[from] !== into) throw new Error(`Reviewed duplicate did not merge: ${from} → ${into}`);
    result.merged.find(item => item.removedId === from).reason = reason;
  }
  return result;
}

// Inventory may use the same label for different departments or rental units.
export function findClassificationCandidates(rows) {
  const groups = new Map();
  for (const row of rows.filter(row => row.published)) {
    const key = [row.brand, row.name.normalize("NFKC").toLowerCase().replace(/\s/g, "")].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ id: row.id, name: row.name, category: row.category, unit: row.unit });
  }
  return [...groups.values()].filter(group => group.length > 1);
}
