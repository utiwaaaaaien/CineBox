import fs from "node:fs";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);
const evidenceFiles = ["camera", "lenses", "lighting", "grip"].map(group => `data/catalog/card-specs-v6-${group}.json`);
const read = path => JSON.parse(fs.readFileSync(new URL(path, root), "utf8"));
const metricKind = label => /^(设计画幅|系列画幅|覆盖画幅|画幅覆盖|画幅)$/.test(label) ? "画幅" : label;

// Nicknames require an explicit, reviewed mapping. A search alias is not necessarily a nickname.
const nicknames = [
  { brand: "ARRI", series: "Master Prime", name: "MP", source: "data/catalog/editorial-decisions.json#eq-arri-arri-mp-镜头" },
  { brand: "ARRI", series: "Signature Prime", name: "SP", source: "data/catalog/editorial-decisions.json#eq-arri-arri-sp-镜头" },
  { brand: "ARRI", series: "Ultra Prime", name: "UP", source: "data/catalog/editorial-decisions.json#eq-arri-arri-up-镜头" },
];

export function catalogCardName(row, reviewed) {
  if (reviewed?.displayName) return { name: reviewed.displayName.value };
  // The canonical fields already preserve series/model boundaries and inventory variants.
  const brand = row.brand === "通用" ? [] : [row.brandZh, row.brandEn];
  const body = [row.series, row.model].filter(Boolean).join(" ");
  const name = (body ? [...brand, body].filter(Boolean).join(" ") : row.name.replace(/^通用\s+/, "")).replace(/\s+/g, " ").trim();
  const nickname = nicknames.find(item => item.brand === row.brand && item.series === row.series);
  return { name: nickname ? `${name}（${nickname.name}）` : name, nickname };
}

export function buildCatalogCards(catalog, { check = false, requireComplete = false, requireReviewed = false } = {}) {
  const ids = new Set(catalog.map(row => row.id));
  const evidence = new Map();
  for (const file of evidenceFiles) {
    for (const row of read(file).rows) {
      if (!ids.has(row.id)) throw new Error(`Unknown card evidence ID: ${row.id}`);
      if (evidence.has(row.id)) throw new Error(`Duplicate card evidence ID: ${row.id}`);
      if (!Array.isArray(row.technicalSpecs) || row.technicalSpecs.length > 3) throw new Error(`Invalid card metrics: ${row.id}`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.checkedAt)) throw new Error(`Missing card review date: ${row.id}`);
      if (row.displayName && (!row.displayName.value?.trim() || !row.displayName.source?.trim() || !row.displayName.reason?.trim())) throw new Error(`Missing card name evidence: ${row.id}`);
      const labels = new Set();
      const kinds = new Set();
      for (const spec of row.technicalSpecs) {
        if (!spec.label?.trim() || !spec.value?.trim() || !spec.source?.trim()) throw new Error(`Missing card metric evidence: ${row.id}`);
        if (!["manufacturer", "inventory"].includes(spec.provenance)) throw new Error(`Invalid metric provenance: ${row.id}`);
        if (!["model", "series"].includes(spec.scope)) throw new Error(`Invalid metric scope: ${row.id}`);
        if (spec.scope === "series" && !row.seriesLabel?.trim()) throw new Error(`Missing reference series: ${row.id}`);
        if (spec.provenance === "manufacturer") {
          let source;
          try { source = new URL(spec.source); } catch { throw new Error(`Invalid manufacturer source URL: ${row.id}`); }
          if (source.protocol !== "https:" || !source.hostname) throw new Error(`Missing manufacturer source: ${row.id}`);
        }
        if (labels.has(spec.label)) throw new Error(`Duplicate metric label: ${row.id}: ${spec.label}`);
        if (kinds.has(metricKind(spec.label))) throw new Error(`Duplicate metric meaning: ${row.id}: ${spec.label}`);
        labels.add(spec.label);
        kinds.add(metricKind(spec.label));
      }
      if (row.technicalSpecs.length < 3 && !row.missing?.length) throw new Error(`Missing review gap explanation: ${row.id}`);
      if (row.technicalSpecs.length < 3 && row.reviewStatus && !["identity-required", "source-unavailable", "research-pending"].includes(row.reviewStatus)) throw new Error(`Invalid card review status: ${row.id}`);
      evidence.set(row.id, row);
    }
  }
  const published = catalog.filter(row => row.published);
  const cards = {};
  const pending = [];
  for (const row of published) {
    const reviewed = evidence.get(row.id);
    if (!reviewed) throw new Error(`Unreviewed card: ${row.id}`);
    const display = catalogCardName(row, reviewed);
    const technicalSpecs = reviewed.technicalSpecs.map(({ label, value, provenance, scope }) => ({ label, value, provenance, scope }));
    cards[row.id] = { name: display.name, technicalSpecs, ...(reviewed.seriesLabel ? { seriesLabel: reviewed.seriesLabel } : {}), checkedAt: reviewed.checkedAt };
    if (reviewed.technicalSpecs.length < 3) pending.push({ id: row.id, name: display.name, category: row.category, confirmedMetrics: reviewed.technicalSpecs.length, reviewStatus: reviewed.reviewStatus || "research-pending", missing: reviewed.missing });
  }
  const summary = {
    reviewedRows: published.length,
    completeRows: published.length - pending.length,
    incompleteRows: pending.length,
    reviewStatus: Object.fromEntries(["identity-required", "source-unavailable", "research-pending"].map(status => [status, pending.filter(row => row.reviewStatus === status).length])),
    seriesReferenceRows: Object.values(cards).filter(card => card.technicalSpecs.some(spec => spec.scope === "series")).length,
    metrics: Object.values(cards).reduce((count, card) => count + card.technicalSpecs.length, 0),
    categories: Object.fromEntries([...new Set(published.map(row => row.category))].map(category => {
      const rows = published.filter(row => row.category === category);
      return [category, { total: rows.length, complete: rows.filter(row => cards[row.id].technicalSpecs.length === 3).length }];
    })),
  };
  const outputs = {
    "app/equipment-card-data.generated.ts": `// Generated by scripts/catalog-card-specs.mjs. Edit card-specs-v6 evidence files instead.\n// Source URLs and review gaps stay in data/catalog; the client only receives display fields.\nexport type CatalogCardSpec = { label: string; value: string; provenance: "manufacturer" | "inventory"; scope: "model" | "series" };\nexport type CatalogCardRecord = { name: string; technicalSpecs: CatalogCardSpec[]; seriesLabel?: string; checkedAt: string };\nexport const equipmentCardData: Record<string, CatalogCardRecord> = ${JSON.stringify(cards, null, 2)};\n`,
    "data/catalog/card-specs-v6-audit.json": `${JSON.stringify({ version: "V6", summary, evidenceFiles, nicknames, pending }, null, 2)}\n`,
  };
  for (const [file, content] of Object.entries(outputs)) {
    const url = new URL(file, root);
    if (check) {
      if (fs.readFileSync(url, "utf8") !== content) throw new Error(`Stale card output: ${file}`);
    } else fs.writeFileSync(url, content);
  }
  if (requireComplete && pending.length) throw new Error(`V6 card release blocked: ${pending.length}/${published.length} records still need three evidenced technical metrics. See data/catalog/card-specs-v6-audit.json`);
  if (requireReviewed && pending.some(row => row.reviewStatus === "research-pending")) throw new Error(`V6 card review incomplete: ${pending.filter(row => row.reviewStatus === "research-pending").length} records still need research. See data/catalog/card-specs-v6-audit.json`);
  return summary;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  console.log(JSON.stringify(buildCatalogCards(read("data/catalog/equipment.v5.json").rows, { check: process.argv.includes("--check"), requireComplete: process.argv.includes("--require-complete"), requireReviewed: process.argv.includes("--require-reviewed") }), null, 2));
}
