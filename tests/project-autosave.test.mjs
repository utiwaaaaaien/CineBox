import assert from "node:assert/strict";
import test from "node:test";
import { autosaveIntervalMs, autosaveKey, createProjectAutosaveWriter, readProjectAutosave } from "../app/project-autosave.ts";

const payload = { projects: [{ id: "p", kit: [{ id: "camera", qty: 3, note: "保留数量" }] }], activeProjectId: "p", historyOverrides: {} };

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test("autosave retains complete project state and only timestamps changes", () => {
  assert.equal(autosaveIntervalMs, 60_000);
  const storage = memoryStorage();
  let ticks = 0;
  const writer = createProjectAutosaveWriter(storage, () => `2026-11-04T00:00:0${++ticks}.000Z`);
  assert.equal(readProjectAutosave(storage), null);
  assert.equal(writer.save(payload).savedAt, "2026-11-04T00:00:01.000Z");
  assert.equal(writer.save(structuredClone(payload)).savedAt, "2026-11-04T00:00:01.000Z");
  assert.equal(ticks, 1);
  assert.deepEqual(readProjectAutosave(storage).payload, payload);
  const changed = { ...payload, historyOverrides: { historical: { quantities: { camera: 4 } } } };
  assert.equal(writer.save(changed).savedAt, "2026-11-04T00:00:02.000Z");
  assert.deepEqual(readProjectAutosave(storage).payload, changed);
  const reloaded = createProjectAutosaveWriter(storage, () => { throw new Error("unchanged data must not write"); });
  assert.equal(reloaded.save(changed).error, null);
});

test("failed writes preserve the previous snapshot and can retry", () => {
  const storage = memoryStorage();
  const originalSet = storage.setItem;
  const writer = createProjectAutosaveWriter(storage, () => "2026-11-04T00:00:00.000Z");
  writer.save(payload);
  const previous = storage.getItem(autosaveKey);
  storage.setItem = () => { throw new Error("quota"); };
  const changed = { ...payload, activeProjectId: "other" };
  assert.match(writer.save(changed).error, /自动存档失败/);
  assert.equal(storage.getItem(autosaveKey), previous);
  storage.setItem = originalSet;
  assert.equal(writer.save(changed).error, null);
  assert.equal(readProjectAutosave(storage).payload.activeProjectId, "other");
});

test("missing, corrupt, incompatible or inaccessible snapshots do not throw", () => {
  const storage = memoryStorage();
  for (const value of ["{", "null", "[]", JSON.stringify({ version: 2 }), JSON.stringify({ version: 1, savedAt: "invalid", payload }), JSON.stringify({ version: 1, savedAt: "2026-11-04", payload: { ...payload, projects: [] } })]) {
    storage.setItem(autosaveKey, value);
    assert.equal(readProjectAutosave(storage), null);
  }
  assert.equal(readProjectAutosave({ getItem() { throw new Error("blocked"); } }), null);
  assert.equal(readProjectAutosave(), null);
});

test("an intentionally empty project collection is recoverable with its history", () => {
  const storage = memoryStorage();
  const empty = { projects: [], activeProjectId: "", historyOverrides: { saved: { quantities: {} } } };
  createProjectAutosaveWriter(storage).save(empty);
  assert.deepEqual(readProjectAutosave(storage)?.payload, empty);
});

test("history recovers independently from missing and corrupt storage without replacing valid current history", async () => {
  const { readStoredHistory } = await import("../app/project-autosave.ts");
  const storage = memoryStorage();
  const saved = { ...payload, historyOverrides: { "saved-history": { quantities: { camera: 120 } } } };
  createProjectAutosaveWriter(storage).save(saved);
  const sanitize = value => value;
  for (const corrupt of [undefined, "{", "null", "[]"]) {
    const broken = { ...storage, getItem: key => key === "cinbox-history-overrides-v1" ? corrupt ?? null : storage.getItem(key) };
    const recovered = readStoredHistory(broken, sanitize);
    assert.equal(recovered.recovered, true);
    assert.deepEqual(recovered.value, saved.historyOverrides);
  }
  storage.setItem("cinbox-history-overrides-v1", "{}");
  assert.deepEqual(readStoredHistory(storage, sanitize), { value: {}, recovered: false, failed: false });
});
