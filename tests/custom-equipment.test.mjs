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
