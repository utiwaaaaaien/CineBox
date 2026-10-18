import assert from "node:assert/strict";
import test from "node:test";
import { buildCameraSystemChecks } from "../app/camera-system-rules.ts";
import { canonicalEquipment } from "../app/equipment-catalog.canonical.ts";

const project = {
  type: "剧情片",
  scale: "完整",
  days: 2,
  cameraCount: 1,
  monitoring: "完整监看",
  captureStyle: [],
};

function check(id, kit, patch = {}) {
  return buildCameraSystemChecks({ ...project, ...patch }, kit, canonicalEquipment).find((item) => item.id === id);
}

test("filter checks follow the selected scene conditions", () => {
  const result = check("filter-protection", [
    { id: "cam-alexa-mini-lf", qty: 1 },
    { id: "filter-nd", qty: 1 },
  ], { sceneConditions: ["日外"] });
  assert.ok(result);
  assert.deepEqual(result.missing, []);

  const reflectiveRisk = check("filter-protection", [
    { id: "cam-alexa-mini-lf", qty: 1 },
    { id: "filter-nd", qty: 1 },
  ], { sceneConditions: ["日外", "反光材质", "风沙/飞沫"] });
  assert.deepEqual(reflectiveRisk?.missing.map((item) => item.id).sort(), ["eq-通用-4-5-65-filter-clear-滤镜", "filter-cpl"]);
});

test("a dolly prompts for its track, then passes when the track is present", () => {
  const missing = check("dolly-track", [
    { id: "cam-alexa-mini", qty: 1 },
    { id: "grip-dolly", qty: 1 },
  ]);
  assert.equal(missing?.missing[0]?.id, "grip-track");

  const complete = check("dolly-track", [
    { id: "cam-alexa-mini", qty: 1 },
    { id: "grip-dolly", qty: 1 },
    { id: "grip-track", qty: 1 },
  ]);
  assert.equal(complete?.missing.length, 0);
});

test("multi-camera monitoring checks quantities, not only presence", () => {
  const result = check("video-chain", [
    { id: "cam-alexa-mini", qty: 2 },
    { id: "video-vaxis2000", qty: 1 },
    { id: "video-smallhd702", qty: 1 },
    { id: "video-dm240", qty: 1 },
  ], { cameraCount: 2 });
  assert.ok(result?.missing.some((item) => item.id === "video-vaxis2000" && item.qty === 2));
  assert.ok(result?.missing.some((item) => item.id === "video-smallhd702" && item.qty === 2));
  assert.ok(result?.missing.some((item) => item.id === "video-dm240" && item.qty === 2));
});

test("every built-in one-click suggestion resolves to the catalogue or a defined custom row", () => {
  const scenarios = [
    [{ id: "cam-alexa-mini-lf", qty: 1 }],
    [{ id: "cam-sony-fx3", qty: 1 }],
    [{ id: "cam-ronin4d", qty: 1 }],
    [{ id: "cam-alexa-mini", qty: 1 }, { id: "grip-dolly", qty: 1 }],
    [{ id: "cam-alexa-mini", qty: 1 }, { id: "grip-jib", qty: 1 }],
  ];
  const ids = new Set(canonicalEquipment.map((item) => item.id));
  for (const kit of scenarios) {
    const checks = buildCameraSystemChecks(project, kit, canonicalEquipment);
    for (const addition of checks.flatMap((item) => item.missing)) {
      assert.ok(addition.custom || ids.has(addition.id), `unresolved suggestion: ${addition.id}`);
    }
  }
});

test("camera and lens mount mismatch becomes a pending compatibility check", () => {
  const result = check("camera-lens-mount", [
    { id: "cam-sony-fx3", qty: 1 },
    { id: "lens-atlas-mercury", qty: 1 },
  ]);
  assert.ok(result);
  assert.equal(result.autoAdd, false);
  assert.match(result.detail, /E.*PL|PL.*E/);
  assert.equal(result.missing[0]?.custom?.subcategory, "卡口与镜头支撑");
});

test("high-speed and dual-format choices create workflow tests, not false confirmations", () => {
  const checks = buildCameraSystemChecks({
    ...project,
    captureStyle: ["高帧率"],
    baseFps: 25,
    highSpeedFps: 100,
    resolution: "4K",
    recordingFormat: "RAW / 高码率",
    shootingRatio: 20,
    screenFormat: "横竖双版本",
  }, [{ id: "cam-red-vraptor", qty: 1 }], canonicalEquipment);

  const highSpeed = checks.find((item) => item.id === "high-speed-workflow");
  const dualFormat = checks.find((item) => item.id === "dual-format-framing");
  assert.equal(highSpeed?.autoAdd, false);
  assert.match(highSpeed?.detail ?? "", /照度、码率、存储、回片和机身散热/);
  assert.equal(dualFormat?.autoAdd, false);
  assert.match(dualFormat?.detail ?? "", /开放门记录、横竖安全框/);
});

test('system completion preserves old catalog recognition and cannot automatically add archived records', () => {
  const catalog = canonicalEquipment.map(row => ({...row,published: !/CODEX.*reader/i.test(row.name)}));
  const checks = buildCameraSystemChecks(project, [{id:'cam-alexa-mini-lf',qty:1}], catalog);
  const media = checks.find(check => check.id === 'recording-media');
  assert.ok(media);
  assert.equal(media.autoAdd, false);
  assert.ok(media.missing.some(row => /Reader/i.test(row.label)));
});
