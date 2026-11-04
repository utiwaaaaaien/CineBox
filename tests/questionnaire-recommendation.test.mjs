import assert from "node:assert/strict";
import test from "node:test";
import { canonicalEquipment } from "../app/equipment-catalog.canonical.ts";
import { buildHistoricalProjectSeed, buildQuestionnaireOnlySeed } from "../app/questionnaire-recommendation.ts";

const questionnaire = {
  type: "剧情片",
  scale: "标准",
  cameraCount: 1,
  cameraBrand: "自动匹配",
  lensStyle: "自动匹配",
  monitoring: "标准监看",
  lightNeed: "不含灯光",
  screenFormat: "横屏",
  captureStyle: [],
};

test("historical mode copies only the selected historical configuration", () => {
  const seed = buildHistoricalProjectSeed({ label: "剧情片器材单", projectName: "测试项目", items: ["cam-alexa-mini", "lens-zeiss-super-speed"] });
  assert.deepEqual(seed.map((item) => item.id), ["cam-alexa-mini", "lens-zeiss-super-speed"]);
  assert.ok(seed.every((item) => item.reason === "历史项目复用：剧情片器材单 · 测试项目"));
});

test("questionnaire-only mode starts from questionnaire choices, not a history profile", () => {
  const seed = buildQuestionnaireOnlySeed(questionnaire, canonicalEquipment);
  assert.equal(seed[0]?.id, "cam-alexa-mini");
  assert.ok(seed.some((item) => item.id === "lens-zeiss-supreme"));
  assert.ok(seed.every((item) => !item.reason.includes("历史")));
});

test("automatic camera choice changes with questionnaire intent", () => {
  assert.equal(buildQuestionnaireOnlySeed({ ...questionnaire, type: "企业宣传片" }, canonicalEquipment)[0]?.id, "cam-sony-fx6");
  assert.equal(buildQuestionnaireOnlySeed({ ...questionnaire, captureStyle: ["微距产品"] }, canonicalEquipment)[0]?.id, "cam-ronin4d");
  assert.equal(buildQuestionnaireOnlySeed({ ...questionnaire, captureStyle: ["高帧率"] }, canonicalEquipment)[0]?.id, "cam-red-vraptor");
  assert.equal(buildQuestionnaireOnlySeed({ ...questionnaire, cameraBrand: "DJI" }, canonicalEquipment)[0]?.id, "cam-ronin4d");
});

test("all questionnaire seed ids resolve to the current equipment catalogue", () => {
  const ids = new Set(canonicalEquipment.map((item) => item.id));
  const scenarios = [
    questionnaire,
    { ...questionnaire, type: "企业宣传片", scale: "轻量", captureStyle: ["稳定器", "竖屏"] },
    { ...questionnaire, type: "TVC", scale: "完整", lensStyle: "微距特殊", monitoring: "完整监看", lightNeed: "完整灯光", captureStyle: ["微距产品", "轨道车", "伸缩摇臂"] },
  ];
  for (const scenario of scenarios) {
    for (const item of buildQuestionnaireOnlySeed(scenario, canonicalEquipment)) assert.ok(ids.has(item.id), `unresolved questionnaire seed: ${item.id}`);
  }
});

test("semantic recommendation reacts to optical and movement attributes", () => {
  const anamorphic = buildQuestionnaireOnlySeed({ ...questionnaire, lensStyle: "变形宽银幕" }, canonicalEquipment);
  assert.ok(anamorphic.some((item) => item.id === "lens-atlas-mercury"));

  const moving = buildQuestionnaireOnlySeed({ ...questionnaire, captureStyle: ["轨道车", "伸缩摇臂"] }, canonicalEquipment);
  assert.ok(moving.some((item) => item.id === "grip-dolly"));
  assert.ok(moving.some((item) => item.id === "grip-track"));
  assert.ok(moving.some((item) => item.id === "grip-howmoco"));
});

test("creative brief influences lens language without an explicit lens preset", () => {
  const widescreen = buildQuestionnaireOnlySeed({ ...questionnaire, aspectRatio: "2.39:1" }, canonicalEquipment);
  assert.ok(widescreen.some((item) => item.id === "lens-atlas-mercury" && item.reason.includes("2.39:1")));

  const soft = buildQuestionnaireOnlySeed({ ...questionnaire, visualTone: "低饱和柔和" }, canonicalEquipment);
  assert.ok(soft.some((item) => item.id === "filter-bpm"));
  assert.ok(soft.some((item) => item.reason.includes("复古定焦")));
});

test("linked camera replacement keeps the chosen body as the system core", () => {
  const seed = buildQuestionnaireOnlySeed(questionnaire, canonicalEquipment, "cam-sony-venice2");
  assert.equal(seed[0]?.id, "cam-sony-venice2");
  assert.match(seed[0]?.reason ?? "", /联动重算/);
  assert.ok(seed.some((item) => item.id === "lens-zeiss-supreme"));
  assert.ok(!seed.some((item) => item.id === "lens-sony-2470"));
});

test("night or high-speed work reserves a high-output fixture when lighting is included", () => {
  const seed = buildQuestionnaireOnlySeed({
    ...questionnaire,
    lightNeed: "轻量灯光",
    sceneConditions: ["夜外"],
    baseFps: 25,
    highSpeedFps: 100,
    captureStyle: ["高帧率"],
  }, canonicalEquipment);
  assert.ok(seed.some((item) => ["light-aputure-600d-pro", "light-arri-m18"].includes(item.id)));
});

test('legacy recommendations never reintroduce unpublished or missing identities', () => {
  const hidden = canonicalEquipment.map(item=>({...item,published:false}));
  assert.deepEqual(buildQuestionnaireOnlySeed(questionnaire,hidden,'cam-alexa-mini'),[]);
  const narrow = canonicalEquipment.filter(item=>item.id==='cam-sony-fx3');
  const result = buildQuestionnaireOnlySeed(questionnaire,narrow);
  assert.ok(result.length);
  assert.ok(result.every(row=>row.id==='cam-sony-fx3'));
});
