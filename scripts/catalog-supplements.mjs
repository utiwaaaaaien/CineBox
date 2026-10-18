import fs from "node:fs";

export const supplements = [JSON.parse(fs.readFileSync(new URL("../data/catalog-supplements/guangyuan-2026-09-20.json", import.meta.url), "utf8"))];
export const supplementInputRows = supplements.reduce((total, batch) => total + batch.sourceRows.reduce((n, row) => n + row.recordIds.length, 0), 0);

// Apply reviewed identities, never fuzzy-match supplier text across product generations.
export function applyCatalogSupplements(base) {
  const rows = structuredClone(base);
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const batch of supplements) {
    for (const addition of batch.additions) {
      const existing = byId.get(addition.id);
      if (existing) {
        if (JSON.stringify(existing) !== JSON.stringify(addition)) throw new Error(`Conflicting addition: ${addition.id}`);
        continue;
      }
      const row = structuredClone(addition);
      rows.push(row);
      byId.set(row.id, row);
    }
    for (const patch of batch.patches) {
      const row = byId.get(patch.id);
      if (!row) throw new Error(`Unknown patch target: ${patch.id}`);
      Object.assign(row, patch.set);
      row.aliases = [...new Set([...row.aliases.filter((alias) => !patch.removeAliases.includes(alias)), ...patch.addAliases])].filter((alias) => alias !== row.name);
    }
    for (const source of batch.sourceRows) {
      for (const id of source.recordIds) if (!byId.has(id)) throw new Error(`Missing supplier mapping: ${id}`);
    }
  }
  const names = new Set();
  for (const row of rows) {
    const key = `${row.category}|${row.name.toLowerCase().replace(/\s+/g, "")}`;
    if (names.has(key)) throw new Error(`Duplicate catalogue name: ${row.name}`);
    names.add(key);
  }
  return rows;
}
