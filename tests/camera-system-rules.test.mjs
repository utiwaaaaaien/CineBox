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

test('a standalone head cannot satisfy a complete tripod system', () => {
  const head = {id:'test-head',name:'TERIS N6 液压云台',brand:'TERIS',category:'移动器材',subcategory:'液压云台',aliases:[],published:true};
  const tripod = {id:'test-legs',name:'TERIS 碳纤维脚架',brand:'TERIS',category:'移动器材',subcategory:'三脚架',aliases:[],published:true};
  const fixture = [...canonicalEquipment,head,tripod];
  const checks = rows => buildCameraSystemChecks({...project,manualSelection:true},[{id:'cam-sony-fx3',qty:1},...rows],fixture).find(check=>check.id==='camera-support');
  assert.ok(checks([{id:head.id,qty:1}]).missing.length);
  assert.equal(checks([{id:head.id,qty:1},{id:tripod.id,qty:1}]).missing.length,0);
});

test('cinema support covers every camera and accepts equivalent heads and legs', () => {
  const tripod = {id:'test-legs',name:'Sachtler 碳纤维脚架',brand:'Sachtler',category:'移动器材',subcategory:'三脚架',aliases:[],published:true};
  const head = {id:'test-head',name:'Sachtler 液压云台',brand:'Sachtler',category:'移动器材',subcategory:'液压云台',aliases:[],published:true};
  const fixture = [...canonicalEquipment,tripod,head];
  const get = quantity => buildCameraSystemChecks({...project,cameraCount:3},[{id:'cam-alexa-mini',qty:3},{id:head.id,qty:quantity},{id:tripod.id,qty:quantity}],fixture).find(check=>check.id==='camera-support');
  assert.equal(get(3).missing.length,0);
  assert.equal(get(2).missing.length,2);
  assert.ok(get(2).missing.every(row=>row.qty===3));
});

test('mixed bodies retain each media requirement and scale by body quantity', () => {
  const checks = buildCameraSystemChecks({...project,manualSelection:true,cameraCount:5},[{id:'cam-alexa-mini-lf',qty:2},{id:'cam-ronin4d',qty:2},{id:'cam-sony-fx3',qty:1}],canonicalEquipment);
  const media = checks.find(row=>row.id==='recording-media').missing;
  assert.equal(media.find(row=>row.id==='accessory-prossd').qty,4);
  assert.equal(media.find(row=>row.id==='eq-codex-codex-960gb-mini-lf-摄影机附件').qty,4);
  assert.ok(media.some(row=>row.id==='rule-camera-media'));
  assert.equal(checks.find(row=>row.id==='camera-power').missing.find(row=>row.id==='accessory-tb50').qty,12);
});

test('matching brand-derived mounts cannot silently pass without actual configuration', () => {
  const checks = buildCameraSystemChecks(project,[{id:'cam-alexa-mini',qty:1},{id:'lens-zeiss-supreme',qty:1}],canonicalEquipment);
  const verification = checks.find(row=>row.id==='camera-mount-verification');
  assert.ok(verification?.missing.length);
  assert.equal(verification.autoAdd,false);
  assert.match(verification.detail,/没有记录实装卡口/);
});
