import assert from "node:assert/strict";
import test from "node:test";
import { companyEquipment } from "../app/equipment-catalog.generated.ts";

// Frozen V4 inventory is not active application code. Node's type stripping
// keeps this validation independent of TypeScript's oversized object union.
test("frozen V4 inventory retains complete, distinct and valid records", () => {
  const categories = new Set(["摄影机", "镜头", "滤镜", "摄影机附件", "监看", "移动器材", "灯光器材", "录音器材", "其他"]);
  const ids = new Set();
  assert.ok(companyEquipment.length > 0);
  for (const row of companyEquipment) {
    for (const key of ["id", "name", "brand", "category", "subcategory", "unit", "source", "provider", "sourceRow"]) {
      assert.equal(typeof row[key], "string", `${row.id}: ${key}`);
      assert.ok(row[key].trim(), `${row.id}: empty ${key}`);
    }
    assert.ok(categories.has(row.category), `${row.id}: category`);
    assert.ok(Number.isFinite(row.costTier) && row.costTier >= 0, `${row.id}: costTier`);
    assert.ok(Array.isArray(row.aliases) && row.aliases.every(alias => typeof alias === "string"), `${row.id}: aliases`);
    assert.ok(!ids.has(row.id), `${row.id}: duplicate ID`);
    ids.add(row.id);
  }
});
