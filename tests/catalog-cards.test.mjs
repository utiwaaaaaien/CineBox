import assert from "node:assert/strict";
import test from "node:test";
import { catalogCardName, buildCatalogCards } from "../scripts/catalog-card-specs.mjs";
import { canonicalEquipment, publishedEquipment } from "../app/equipment-catalog.canonical.ts";
import { equipmentCardData } from "../app/equipment-card-data.generated.ts";

test("card display data covers every selectable identity without changing project identities", () => {
  assert.deepEqual(Object.keys(equipmentCardData).sort(), publishedEquipment.map(row => row.id).sort());
  const before = JSON.stringify(canonicalEquipment);
  const summary = buildCatalogCards(canonicalEquipment, { check: true, requireReviewed: true });
  assert.equal(JSON.stringify(canonicalEquipment), before);
  assert.equal(summary.reviewedRows, publishedEquipment.length);
  for (const card of Object.values(equipmentCardData)) {
    assert.ok(card.name.trim());
    assert.ok(card.technicalSpecs.length <= 3);
    assert.equal(new Set(card.technicalSpecs.map(spec => spec.label)).size, card.technicalSpecs.length);
    for (const spec of card.technicalSpecs) {
      assert.ok(spec.label && spec.value);
      if (spec.scope === "series") assert.ok(card.seriesLabel);
    }
  }
});

test("card names preserve variants and add only reviewed industry nicknames", () => {
  const row = { brand: "ARRI", brandZh: "阿莱", brandEn: "ARRI", series: "Master Prime", model: "25mm T1.3 PL口", name: "阿莱 ARRI Master Prime 25mm T1.3 PL口" };
  assert.equal(catalogCardName(row).name, "阿莱 ARRI Master Prime 25mm T1.3 PL口（MP）");
  assert.equal(catalogCardName({ ...row, series: "Master Anamorphic" }).nickname, undefined);
  assert.equal(catalogCardName({ brand: "Lensbaby", brandEn: "Lensbaby", model: "", name: "Lensbaby" }).name, "Lensbaby");
  assert.equal(catalogCardName({ brand: "通用", brandZh: "通用", model: "PL口 2× 增倍镜", name: "通用 PL口 2× 增倍镜" }).name, "PL口 2× 增倍镜");
  assert.equal(row.model, "25mm T1.3 PL口");
  assert.equal(equipmentCardData["eq-transvideo-transvideo-starlite-hd-5-5-监看"].name, "Transvideo StarliteHD 5″");
});

test("the strict completeness gate reports remaining specification gaps", () => {
  const summary = buildCatalogCards(canonicalEquipment, { check: true });
  if (summary.incompleteRows) {
    assert.throws(() => buildCatalogCards(canonicalEquipment, { check: true, requireComplete: true }), /V6 card release blocked/);
  } else {
    assert.doesNotThrow(() => buildCatalogCards(canonicalEquipment, { check: true, requireComplete: true }));
  }
});

test("model numbers cannot become power or weight measurements", () => {
  const aja = equipmentCardData["eq-通用-video-emhancer-aja-3g-hd-监看"];
  const lm = equipmentCardData["eq-通用-zunzheng-lm-0750w-7-monitor-监看"];
  const tvlogic = equipmentCardData["eq-tvlogic-tvlogic058-监看"];
  assert.ok(!aja.technicalSpecs.some(spec => spec.label === "重量"));
  assert.ok(!lm.technicalSpecs.some(spec => spec.label === "功率"));
  assert.ok(!tvlogic.technicalSpecs.some(spec => spec.value === "058 W（库存名称明示）"));
});
