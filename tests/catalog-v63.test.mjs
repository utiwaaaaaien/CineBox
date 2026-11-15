import test from "node:test";
import assert from "node:assert/strict";
import { publishedEquipment } from "../app/equipment-catalog.canonical.ts";
import { equipmentCardData } from "../app/equipment-card-data.generated.ts";
import { migrateCatalogKit } from "../app/catalog-identity.ts";
import { buildEquipmentSeries } from "../app/equipment-series.ts";
import { classification } from "../scripts/catalog-v63.mjs";

test("specialty catalogs publish separate variants with appropriate evidence and categories", () => {
  const lens = publishedEquipment.filter(row => row.brand === "Ying Ding");
  assert.ok(lens.length > 100);
  assert.ok(lens.every(row => !row.verified && row.category === "镜头" && /#page=\d+$/.test(row.references[0].url)));
  assert.equal(lens.find(row => row.id === "v63-yd-pentax-k-50mm-f1-2").lensMount, "unknown");
  assert.equal(lens.find(row => row.id === "v63-yd-carl-zeiss-jena-20mm-t2-9-pl").lensMount, "PL");
  const variants = buildEquipmentSeries(lens).find(group => group.name === "Pentax K").items.filter(row => row.model.startsWith("50mm"));
  assert.equal(variants.length, 2);
  assert.ok(equipmentCardData[variants[0].id].technicalSpecs.every(spec => spec.provenance === "inventory"));
  const nd = publishedEquipment.filter(row => row.id.startsWith("v63-nisi-fsnd"));
  assert.equal(nd.length, 16);
  assert.ok(nd.every(row => row.verified && row.category === "滤镜"));
  assert.equal(publishedEquipment.find(row => row.id === "v63-nisi-c5-cinema").category, "摄影机附件");
  for (const id of ["v63-2268", "v63-2269", "v63-vb99-3580", "v63-vb99-3580b"]) {
    assert.ok(publishedEquipment.some(row => row.id === id && row.verified), id);
  }
});

test("reviewed cross-category duplicates restore quantities and remarks under the retained identity", () => {
  for (const { from, into } of classification.merges) {
    assert.ok(!publishedEquipment.some(row => row.id === from));
    assert.ok(publishedEquipment.some(row => row.id === into));
    const kit = migrateCatalogKit([
      { id: into, qty: 2, note: "A", status: "confirmed" },
      { id: from, qty: 3, note: "B", status: "pending" },
    ]);
    assert.deepEqual(kit, [{ id: into, qty: 5, note: "A；B", status: "pending", reason: "", userAdjusted: false }]);
  }
});
