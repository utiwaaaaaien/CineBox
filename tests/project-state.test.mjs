import assert from "node:assert/strict";
import test from "node:test";
import { addOrIncrementKitItem, mergeGeneratedKit, sanitizeProjectRecords } from "../app/project-state.ts";

const defaultForm = {
  name: "未命名项目",
  type: "企业宣传片",
  days: 1,
  cameraCount: 1,
  captureStyle: ["稳定器"],
  audioNeed: false,
};

const options = {
  defaultForm,
  isKnownEquipmentId: (id) => ["cam-a", "lens-a", "monitor-a"].includes(id),
  isCategory: (value) => ["摄影机", "镜头", "监看", "其他"].includes(value),
  createId: (() => {
    let value = 0;
    return (prefix) => `${prefix}-repaired-${++value}`;
  })(),
  now: () => "2026-07-26T00:00:00.000Z",
  numericBounds: {
    days: [1, 60],
    cameraCount: [1, 8],
  },
};

test("sanitizes restored projects and repairs malformed kit rows", () => {
  const projects = sanitizeProjectRecords([
    {
      id: "project-a",
      form: {
        name: "测试项目",
        type: 42,
        days: 999,
        cameraCount: Number.NaN,
        captureStyle: ["稳定器", 12],
        audioNeed: "yes",
      },
      kit: [
        { id: "cam-a", qty: 0 },
        { id: "lens-a", qty: 2.7, note: 42, reason: null, status: "broken" },
        { id: "unknown", qty: 1 },
        {
          id: "custom-a",
          qty: 2,
          custom: { name: "烟饼", brand: "", category: "其他", subcategory: "", unit: "" },
        },
      ],
      status: "unknown",
      createdAt: "not-a-date",
    },
  ], options);

  assert.equal(projects.length, 1);
  assert.deepEqual(projects[0].form, {
    ...defaultForm,
    name: "测试项目",
    days: 60,
    captureStyle: ["稳定器"],
  });
  assert.equal(projects[0].status, "active");
  assert.equal(projects[0].createdAt, "2026-07-26T00:00:00.000Z");
  assert.deepEqual(projects[0].kit.map((row) => row.id), ["cam-a", "lens-a", "custom-a"]);
  assert.equal(projects[0].kit[0].qty, 1);
  assert.equal(projects[0].kit[0].reason, "恢复的器材");
  assert.equal(projects[0].kit[1].qty, 3);
  assert.equal(projects[0].kit[1].status, undefined);
  assert.deepEqual(projects[0].kit[2].custom, {
    name: "烟饼",
    brand: "通用",
    category: "其他",
    subcategory: "自定义",
    unit: "件",
  });
});

test("repairs duplicate project ids and ignores non-project values", () => {
  const projects = sanitizeProjectRecords([
    { id: "same", form: { name: "A" }, kit: [] },
    null,
    { id: "same", form: { name: "B" }, kit: [] },
    { id: "missing-form" },
  ], options);

  assert.equal(projects.length, 2);
  assert.equal(projects[0].id, "same");
  assert.equal(projects[1].id, "project-repaired-1");
});

test("rejects unsupported form options and bounds restored text", () => {
  const longText = "长".repeat(12_000);
  const [project] = sanitizeProjectRecords([
    {
      id: "project-safe",
      form: {
        name: longText,
        type: "不存在的类型",
        baseFps: 27,
        captureStyle: ["稳定器", "未知方式", "稳定器"],
      },
      kit: [{ id: "cam-a", qty: 1, note: longText, reason: longText }],
      createdAt: "2026-07-26T08:00:00+08:00",
    },
  ], {
    ...options,
    defaultForm: { ...defaultForm, baseFps: 25 },
    allowedStringValues: { type: ["企业宣传片", "剧情片"] },
    allowedNumberValues: { baseFps: [24, 25, 30] },
    allowedArrayValues: { captureStyle: ["稳定器", "滑轨"] },
  });

  assert.equal(project.form.name.length, 10_000);
  assert.equal(project.form.type, "企业宣传片");
  assert.equal(project.form.baseFps, 25);
  assert.deepEqual(project.form.captureStyle, ["稳定器"]);
  assert.equal(project.kit[0].note.length, 2_000);
  assert.equal(project.kit[0].reason.length, 1_000);
  assert.equal(project.createdAt, "2026-07-26T00:00:00.000Z");
});

test("regeneration preserves user-owned work while replacing untouched recommendations", () => {
  const current = [
    { id: "cam-a", qty: 2, note: "A 机测试通过", reason: "旧推荐", status: "confirmed", userAdjusted: true },
    { id: "lens-a", qty: 1, note: "", reason: "旧推荐", status: "recommended" },
    { id: "manual-a", qty: 1, note: "自备", reason: "手动加入", status: "manual", custom: { name: "自备夹具", brand: "通用", category: "其他", subcategory: "自定义", unit: "件" } },
    { id: "pending-a", qty: 1, note: "", reason: "系统检查", status: "pending", custom: { name: "测试计划", brand: "通用", category: "其他", subcategory: "测试计划", unit: "项" } },
    { id: "annotated-a", qty: 1, note: "用户备注", reason: "旧推荐", status: "recommended" },
  ];
  const generated = [
    { id: "cam-a", qty: 1, note: "", reason: "新推荐", status: "recommended" },
    { id: "monitor-a", qty: 1, note: "", reason: "新推荐", status: "recommended" },
  ];

  const result = mergeGeneratedKit(current, generated);

  assert.deepEqual(result.rows.map((row) => row.id), ["cam-a", "monitor-a", "manual-a", "pending-a", "annotated-a"]);
  assert.deepEqual(result.rows[0], {
    ...generated[0],
    qty: 2,
    note: "A 机测试通过",
    reason: "新推荐",
    status: "confirmed",
    userAdjusted: true,
  });
  assert.ok(!result.rows.some((row) => row.id === "lens-a"));
  assert.equal(result.preservedCount, 4);
});

test("manually incrementing an existing recommendation survives regeneration", () => {
  const incremented = addOrIncrementKitItem(
    [{ id: "cam-a", qty: 1, note: "", reason: "系统推荐", status: "recommended" }],
    "cam-a",
    "从器材库手动加入",
  );
  assert.equal(incremented[0].qty, 2);
  assert.equal(incremented[0].userAdjusted, true);

  const regenerated = mergeGeneratedKit(
    incremented,
    [{ id: "cam-a", qty: 1, note: "", reason: "新推荐", status: "recommended" }],
  );
  assert.equal(regenerated.rows[0].qty, 2);
});

test('restores the unmet requirement review notice with an existing project', () => {
  const [restored] = sanitizeProjectRecords([{ id: 'project-reviewed', form: defaultForm, kit: [ { id: 'cam-a', qty: 1 } ], requirementsChanged: true }], options);
  assert.equal(restored.requirementsChanged, true);
  assert.equal(restored.kit.length, 1);
});

test("repairs inherited-object project ids before they can index undo history", () => {
  const restored = sanitizeProjectRecords(["__proto__", "constructor", "toString"].map(id => ({ id, form: { name: id }, kit: [] })), options);
  const history = {};
  for (const project of restored) {
    assert.equal(Object.hasOwn(Object.prototype, project.id), false);
    assert.equal(history[project.id], undefined);
  }
});

test("restoration preserves every pre-existing project beyond the new-project limit", async () => {
  const { maxProjectCount, projectCapacityError } = await import("../app/project-state.ts");
  const input = Array.from({ length: maxProjectCount + 1 }, (_, index) => ({ id: `saved-${index}`, form: { name: `保留项目 ${index}` }, kit: [] }));
  const restored = sanitizeProjectRecords(input, options);
  assert.equal(restored.length, input.length);
  assert.equal(restored.at(-1).form.name, `保留项目 ${maxProjectCount}`);
  assert.equal(projectCapacityError(maxProjectCount - 1, 1), null);
  assert.match(projectCapacityError(1, maxProjectCount), /不能超过 500/);
});

test("rejects impossible calendar dates in restored project forms", () => {
  const dateOptions = { ...options, defaultForm: { ...defaultForm, shootDate: "" } };
  for (const date of ["2026-02-31", "2026-02-29", "2026-13-01", "not-a-date"]) {
    const [restored] = sanitizeProjectRecords([{ id: 'dated', form: { shootDate: date } }], dateOptions);
    assert.equal(restored.form.shootDate, "");
  }
  const [leap] = sanitizeProjectRecords([{ id: 'dated', form: { shootDate: "2028-02-29" } }], dateOptions);
  assert.equal(leap.form.shootDate, "2028-02-29");
});

test("a full historical archive permits replacing a slot but rejects a new slot atomically", async () => {
  const { historyCapacityError } = await import("../app/project-state.ts");
  const current = Object.fromEntries(Array.from({ length: 500 }, (_, index) => [`slot-${index}`, { name: `历史 ${index}` }]));
  const before = JSON.stringify(current);
  assert.equal(historyCapacityError(current, { "slot-0": { name: "替换内置项目" } }, 500), null);
  assert.match(historyCapacityError(current, { "new-slot": {} }, 500), /产生 501 个/);
  assert.equal(JSON.stringify(current), before);
});
