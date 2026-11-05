import assert from "node:assert/strict";
import test from "node:test";
import { createCustomKitRow, isBlankCustomKitItem, updateCustomKitRow } from "../app/custom-equipment.ts";
import { sanitizeProjectRecords } from "../app/project-state.ts";
import { recordKitChange, travelKitHistory } from "../app/kit-workflow.ts";
import { createProjectAutosaveWriter, readProjectAutosave } from "../app/project-autosave.ts";

const options = {
  defaultForm: { name: "项目" },
  isKnownEquipmentId: id => id === "camera",
  isCategory: value => ["摄影机", "移动器材", "灯光器材"].includes(value),
  createId: () => "new-project",
};
const row = () => createCustomKitRow("custom-a", "移动器材");

test("multiple unnamed category rows survive JSON backup, autosave, and undo independently", () => {
  const blanks = [row(), createCustomKitRow("custom-b", "移动器材"), createCustomKitRow("custom-c", "灯光器材")];
  const payload = { projects: [{ id: "project-a", form: { name: "项目" }, kit: blanks }], activeProjectId: "project-a", historyOverrides: {} };
  const backup = JSON.parse(JSON.stringify({ version: 2, ...payload }));
  const restored = sanitizeProjectRecords(backup.projects, options)[0].kit;
  assert.equal(restored.length, 3);
  assert.deepEqual(restored.map(item => item.id), ["custom-a", "custom-b", "custom-c"]);
  assert.equal(restored.every(item => item.draft && isBlankCustomKitItem(item)), true);
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  createProjectAutosaveWriter(storage).save(payload);
  assert.equal(sanitizeProjectRecords(readProjectAutosave(storage).payload.projects, options)[0].kit.length, 3);
  const history = recordKitChange({ past: [], future: [] }, blanks, "填写器材名称");
  const filled = [updateCustomKitRow(blanks[0], { name: "自备滑轨" }), ...blanks.slice(1)];
  const undo = travelKitHistory(history, filled, "undo");
  assert.equal(undo.rows.every(isBlankCustomKitItem), true);
  const redo = travelKitHistory(undo.history, undo.rows, "redo");
  assert.equal(redo.rows[0].custom.name, "自备滑轨");
  assert.equal(isBlankCustomKitItem(redo.rows[0]), false);
});

test("filling and clearing a custom row updates draft state without changing its identity, quantity or notes", () => {
  const blank = { ...row(), qty: 120, note: "保留备注" };
  const filled = updateCustomKitRow(blank, { name: "ARRI ", brand: "自备" });
  assert.equal(filled.custom.name, "ARRI ");
  assert.equal(filled.draft, undefined);
  assert.equal(blank.custom.name, "");
  const cleared = updateCustomKitRow(filled, { name: "  " });
  assert.equal(cleared.draft, true);
  assert.equal(isBlankCustomKitItem(cleared), true);
  for (const item of [filled, cleared]) {
    assert.equal(item.id, blank.id);
    assert.equal(item.qty, 120);
    assert.equal(item.note, "保留备注");
  }
  const restored = sanitizeProjectRecords([{ id: "p", form: {}, kit: [filled, createCustomKitRow("custom-b", "移动器材")] }], options)[0].kit;
  assert.equal(restored[0].draft, undefined);
  assert.equal(restored[0].custom.name, "ARRI");
});

test("blank names require an explicit draft flag and valid custom category on restore", () => {
  const explicit = row();
  const ordinary = createCustomKitRow("malformed", "移动器材");
  delete ordinary.draft;
  const invalidCategory = { ...createCustomKitRow("invalid-category", "不存在"), draft: true };
  const invalidName = { ...createCustomKitRow("invalid-name", "移动器材"), custom: { ...row().custom, name: null } };
  const namedDraft = { ...createCustomKitRow("named", "移动器材"), custom: { ...row().custom, name: "滑轨" } };
  const knownDraft = { id: "camera", qty: 2, draft: true, custom: row().custom };
  const restored = sanitizeProjectRecords([{ id: "p", form: {}, kit: [explicit, ordinary, invalidCategory, invalidName, namedDraft, knownDraft] }], options)[0].kit;
  assert.deepEqual(restored.map(item => item.id), ["custom-a", "named", "camera"]);
  assert.equal(restored[0].draft, true);
  assert.equal(restored[1].draft, undefined);
  assert.equal(restored[2].draft, undefined);
  assert.equal(restored[2].custom, undefined);
});

test("custom edits enforce persistent field limits while preserving untouched row data", () => {
  const changed = updateCustomKitRow(row(), { name: "器".repeat(300), brand: "牌".repeat(200), subcategory: "类".repeat(200), unit: "件".repeat(30) });
  assert.equal(changed.custom.name.length, 240);
  assert.equal(changed.custom.brand.length, 120);
  assert.equal(changed.custom.subcategory.length, 120);
  assert.equal(changed.custom.unit.length, 20);
  assert.equal(changed.draft, undefined);
  assert.equal(changed.custom.category, "移动器材");
  assert.equal(isBlankCustomKitItem({}), false);
});

test("applying a suggestion keeps quantity and note, adopts canonical identity and remains restorable", async () => {
  const { applyEquipmentSuggestion } = await import("../app/custom-equipment.ts");
  const blank = { ...row(), qty: 120, note: "保留租赁备注" };
  const rows = [blank, createCustomKitRow("other", "移动器材")];
  const selected = applyEquipmentSuggestion(rows, blank.id, { id: "camera", name: "SONY FX3", unit: "台" });
  assert.equal(selected[0].id, "camera");
  assert.equal(selected[0].qty, 120);
  assert.equal(selected[0].note, "保留租赁备注");
  assert.equal(selected[0].reason, "从联想选择：SONY FX3");
  assert.equal(selected[0].status, "manual");
  assert.equal(selected[0].userAdjusted, true);
  assert.equal("custom" in selected[0], false);
  assert.equal("draft" in selected[0], false);
  assert.equal(selected[1], rows[1]);
  assert.equal(blank.draft, true);
  assert.equal(blank.id, "custom-a");
  const restored = sanitizeProjectRecords(JSON.parse(JSON.stringify([{ id: "p", form: {}, kit: selected }])), options)[0].kit;
  assert.equal(restored[0].id, "camera");
  assert.equal(restored[0].qty, 120);
  assert.equal(restored[1].draft, true);
  const history = recordKitChange({ past: [], future: [] }, rows, "从联想选择器材");
  const undo = travelKitHistory(history, selected, "undo");
  assert.deepEqual(undo.rows, rows);
  assert.equal(undo.rows[0].draft, true);
});

test("choosing already-selected equipment combines quantities and unique notes without replacing existing reasons", async () => {
  const { applyEquipmentSuggestion } = await import("../app/custom-equipment.ts");
  const existing = { id: "camera", qty: 2, note: "A机配件", reason: "此前人工确认", status: "confirmed" };
  const blank = { ...row(), qty: 3, note: "B机配件" };
  const unrelated = createCustomKitRow("other", "移动器材");
  const selected = applyEquipmentSuggestion([blank, existing, unrelated], blank.id, { id: "camera", name: "SONY FX3" });
  assert.deepEqual(selected.map(item => item.id), ["camera", "other"]);
  assert.equal(selected[0].qty, 5);
  assert.equal(selected[0].note, "A机配件；B机配件");
  assert.equal(selected[0].reason, "此前人工确认");
  assert.equal(selected[0].status, "manual");
  assert.equal(selected[0].userAdjusted, true);
  assert.equal(selected[1], unrelated);
  assert.equal(existing.qty, 2);
  const sameNote = applyEquipmentSuggestion([existing, { ...blank, note: existing.note }], blank.id, { id: "camera", name: "SONY FX3" });
  assert.equal(sameNote[0].note, "A机配件");
});

test("suggestion conflicts retain overflow evidence and ignore absent or non-custom source rows", async () => {
  const { applyEquipmentSuggestion } = await import("../app/custom-equipment.ts");
  const existing = { id: "camera", qty: 800, note: "原备注", reason: "原理由", status: "manual" };
  const blank = { ...row(), qty: 700, note: "新增备注" };
  const rows = [existing, blank];
  const selected = applyEquipmentSuggestion(rows, blank.id, { id: "camera", name: "SONY FX3" });
  assert.equal(selected.length, 1);
  assert.equal(selected[0].qty, 999);
  assert.match(selected[0].note, /合并前合计 1500.*请核对数量/);
  assert.ok(selected[0].note.includes("原备注") && selected[0].note.includes("新增备注"));
  assert.equal(selected[0].reason, "原理由");
  assert.equal(applyEquipmentSuggestion(rows, "missing", { id: "camera", name: "SONY FX3" }), rows);
  assert.equal(applyEquipmentSuggestion(rows, "camera", { id: "other-camera", name: "其他相机" }), rows);
});

test("merging two full-length notes preserves all text through backup, autosave, restore and undo", async () => {
  const { applyEquipmentSuggestion } = await import("../app/custom-equipment.ts");
  const existing = { id: "camera", qty: 800, note: "原".repeat(2_000), reason: "原理由", status: "confirmed" };
  const draft = { ...row(), qty: 700, note: "新".repeat(2_000) };
  const before = [existing, draft];
  const combined = applyEquipmentSuggestion(before, draft.id, { id: "camera", name: "SONY FX3" });
  const expectedNote = `合并前合计 1500，超过单行上限，请核对数量；${existing.note}；${draft.note}`;
  assert.equal(combined[0].note, expectedNote);
  const payload = { projects: [{ id: "p", form: {}, kit: combined }], activeProjectId: "p", historyOverrides: {} };
  const restored = sanitizeProjectRecords(JSON.parse(JSON.stringify(payload.projects)), options);
  assert.equal(restored[0].kit[0].note, expectedNote);
  const storageValues = new Map();
  const storage = { getItem: key => storageValues.get(key) ?? null, setItem: (key, value) => storageValues.set(key, value) };
  assert.equal(createProjectAutosaveWriter(storage).save(payload).error, null);
  const autosaved = sanitizeProjectRecords(readProjectAutosave(storage).payload.projects, options);
  assert.equal(autosaved[0].kit[0].note, expectedNote);
  const history = recordKitChange({ past: [], future: [] }, before, "合并器材");
  const undo = travelKitHistory(history, combined, "undo");
  assert.deepEqual(undo.rows, before);
  const redo = travelKitHistory(undo.history, undo.rows, "redo");
  assert.equal(redo.rows[0].note, expectedNote);
  assert.equal(existing.note.length, 2_000);
  assert.equal(draft.note.length, 2_000);
});

test("suggestions keep pre-existing notes above the input cap and retain meaningful whitespace verbatim", async () => {
  const { applyEquipmentSuggestion } = await import("../app/custom-equipment.ts");
  const note = `\n${"既有备注".repeat(2_000)}  `;
  const existing = { id: "camera", qty: 1, note, reason: "人工备注", status: "manual" };
  const draft = { ...row(), note: " \n " };
  const combined = applyEquipmentSuggestion([existing, draft], draft.id, { id: "camera", name: "SONY FX3" });
  assert.equal(combined[0].note, `${note}；${draft.note}`);
  const restored = sanitizeProjectRecords([{ id: "p", form: {}, kit: combined }], options);
  assert.equal(restored[0].kit[0].note, combined[0].note);
});
