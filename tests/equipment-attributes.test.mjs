import assert from "node:assert/strict";
import test from "node:test";
import { canonicalEquipment, canonicalEquipmentStats } from "../app/equipment-catalog.canonical.ts";
import { classifyEquipment } from "../app/equipment-attributes.ts";

const byId = (id) => canonicalEquipment.find((item) => item.id === id);

test("every catalogue row receives a usable semantic role", () => {
  assert.equal(canonicalEquipment.length, canonicalEquipmentStats.canonicalRows);
  for (const item of canonicalEquipment) {
    const attributes = classifyEquipment(item);
    assert.ok(attributes.role, `missing role: ${item.id}`);
    assert.ok(Array.isArray(attributes.traits), `missing traits: ${item.id}`);
    assert.ok(attributes.system, `missing system: ${item.id}`);
  }
});

test("representative equipment is classified by real production function", () => {
  assert.equal(classifyEquipment(byId("cam-ronin4d")).role, "camera");
  assert.ok(classifyEquipment(byId("cam-ronin4d")).traits.includes("integrated-stabilization"));
  assert.ok(classifyEquipment(byId("lens-atlas-mercury")).traits.includes("anamorphic"));
  assert.ok(classifyEquipment(byId("lens-dzo-gnosis")).traits.includes("macro"));
  assert.equal(classifyEquipment(byId("filter-cpl")).role, "filter");
  assert.ok(classifyEquipment(byId("filter-cpl")).traits.includes("cpl"));
  assert.equal(classifyEquipment(byId("video-vaxis2000")).role, "video-transmission");
  assert.equal(classifyEquipment(byId("grip-oconnor2575")).role, "tripod-head");
  assert.equal(classifyEquipment(byId("grip-dolly")).role, "dolly");
  assert.equal(classifyEquipment(byId("grip-track")).role, "track");
});

test('support legs and sliders are not reclassified by their brand or a generic track subcategory', () => {
  const fixture = (name,subcategory) => ({id:'test',name,subcategory,brand:'TERIS',category:'移动器材',aliases:[]});
  assert.equal(classifyEquipment(fixture('TERIS 碳纤维脚架','脚架')).role,'tripod-legs');
  assert.equal(classifyEquipment(fixture('GFM GF-120cm slider','轨道')).role,'slider');
});
