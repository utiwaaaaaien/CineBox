import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { resolveCatalogId } from "../app/catalog-identity.ts";
import { canonicalEquipment as rows } from "../app/equipment-catalog.canonical.ts";
import { applyCatalogSupplements, supplements } from "../scripts/catalog-supplements.mjs";
import { classifyEquipment } from "../app/equipment-attributes.ts";
import { buildQuestionnaireOnlySeed } from "../app/questionnaire-recommendation.ts";
import { buildEquipmentWorkbook } from "../app/excel-export.ts";
import XLSX from "xlsx";
import writeXlsxFile from "write-excel-file/node";

const batch = supplements[0];
const byId = new Map(rows.map((row) => [row.id, row]));
const inventory = JSON.parse(fs.readFileSync(new URL("../data/catalog/v4-inventory.json", import.meta.url), "utf8")).rows;
test("every actual supplier line resolves to preserved or new catalogue identities", () => {
  assert.equal(batch.sourceRows.length, 164);
  assert.equal(batch.additions.length, 96);
  assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
  const fields = Object.keys(inventory[0]).sort();
  for (const source of batch.sourceRows) {
    assert.ok(source.recordIds.length, source.text);
    for (const id of source.recordIds) assert.ok(byId.has(resolveCatalogId(id)), `${source.line}: ${id}`);
  }
  for (const row of batch.additions) assert.deepEqual(Object.keys(row).sort(), fields);
  assert.deepEqual(applyCatalogSupplements(inventory), inventory, "archival import remains idempotent; V5 names use independent official evidence");
});

test("new generations and supplier corrections preserve exact identities", () => {
  for (const id of ["cam-sony-fx5", "cam-sony-a7m5", "cam-canon-c80", "cam-freefly-ember-s5k", "cam-dji-osmo-360-ii", "cam-canon-r5m2"]) assert.ok(byId.has(id));
  assert.equal(byId.get("lens-dzo-xtract").name, "东正 DZOFILM X-tract 18-28mm T8");
  const macro = batch.sourceRows.find((row) => row.line === 50);
  assert.match(byId.get(resolveCatalogId(macro.recordIds[0])).name, /Master Macro 100mm T2/);
  assert.match(byId.get("lens-thypoch-simera-c-16-e").name, /T1.9/);
  const sirui = byId.get("lens-sirui-150-anamorphic-e");
  assert.match(sirui.name, /150mm 1.6× E口/);
  assert.equal(sirui.verified, false); assert.equal(sirui.published, true);
  assert.ok(sirui.aliases.some(alias => /系列待确认/.test(alias)));
  assert.ok(!byId.get("grip-howmoco").aliases.some((alias) => alias.includes("天蝎")));
});

test("new camera and lens mounts do not inherit unrelated brand defaults", () => {
  const mount = (id) => classifyEquipment(byId.get(id)).lensMount;
  assert.equal(mount("cam-canon-c80"), "RF");
  assert.equal(mount("cam-canon-r5m2"), "RF");
  assert.equal(mount("cam-sony-fx5"), "E");
  assert.equal(mount("lens-thypoch-simera-c-16-e"), "E");
  assert.equal(mount("lens-sirui-saturn-35-e"), "E");
  assert.equal(mount("lens-canon-rf-24-70"), "RF");
  assert.equal(mount("lens-cooke-sp3-18"), "unknown");
  assert.equal(mount("cam-freefly-ember-s5k"), "unknown");
  assert.ok(classifyEquipment(byId.get("cam-freefly-ember-s5k")).traits.includes("high-speed"));
});

test("unconfirmed supplier series stay manually selectable without automatic recommendation", () => {
  const pending = batch.additions.filter((row) => /待确认/.test(row.name));
  const seed = buildQuestionnaireOnlySeed({ type: "剧情片", scale: "轻量", cameraBrand: "自动匹配", captureStyle: [], cameraCount: 1 }, pending);
  assert.deepEqual(seed, []);
});

test("actual imported model names survive Excel export and workbook re-read", async () => {
  const selected = ["cam-sony-fx5", "cam-canon-c80", "lens-thypoch-simera-c-16-e"].map((id) => byId.get(id));
  const groups = ["摄影机", "镜头"].map((name) => ({ name, rows: selected.filter((row) => row.category === name).map((row) => ({ name: row.name, qty: 1, unit: row.unit, note: "光园清单回归验证" })) }));
  const workbook = buildEquipmentWorkbook({ name: "光园补库回归", type: "剧情片", shootDate: "2026-09-20", days: 1, cameraCount: 1, dop: "", contact: "", notes: "" }, groups);
  const buffer = await writeXlsxFile(workbook.sheets, { fontFamily: "Arial", fontSize: 10 }).toBuffer();
  const read = XLSX.read(buffer, { type: "buffer" });
  const text = read.SheetNames.map((name) => XLSX.utils.sheet_to_csv(read.Sheets[name])).join("\n");
  for (const row of selected) assert.ok(text.includes(row.name), row.name);
});

 test("new focal lenses participate in the matching equipment series", async () => {
  const { buildEquipmentSeries } = await import("../app/equipment-series.ts");
  const series = buildEquipmentSeries(rows);
  assert.equal(series.find(s => s.name === "瞬").items.length, 6);
  assert.ok(series.find(s => s.name === "Cinema Line FX 系列").items.some(r => r.id === "cam-sony-fx5"));
  assert.ok(series.find(s => s.name === "Type EZ").items.some(r => /EZ-?3/i.test(r.name)));
 });
