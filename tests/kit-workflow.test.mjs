import assert from 'node:assert/strict';
import test from 'node:test';
import { addKitSelection, recordKitChange, travelKitHistory, describeKitChange, frameSelection, captureAtFrameRate } from '../app/kit-workflow.ts';

const camera = { id: 'camera', qty: 3, note: '已租', reason: '人工', status: 'confirmed', userAdjusted: true };
const lens = { id: 'lens', qty: 1, note: '', reason: '推荐', status: 'recommended' };

test('repeated selections and partial series additions preserve quantity, notes and decisions', () => {
  const current = [camera];
  assert.equal(addKitSelection(current, [camera]), current);
  const next = addKitSelection(current, [{ ...camera, qty: 1, note: '' }, lens, lens]);
  assert.deepEqual(next, [camera, lens]);
  assert.equal(next[0], camera);
  assert.equal(addKitSelection(next, [camera, lens]), next);
});

test('undo and redo restore a removed confirmed item with all its data', () => {
  const original = [camera, lens];
  const changed = [lens];
  const history = recordKitChange({ past: [], future: [] }, original, '移除摄影机');
  const undo = travelKitHistory(history, changed, 'undo');
  assert.deepEqual(undo.rows, original);
  const redo = travelKitHistory(undo.history, undo.rows, 'redo');
  assert.deepEqual(redo.rows, changed);
  assert.equal(travelKitHistory(redo.history, changed, 'redo'), undefined);
});

test('continuous quantity edits undo together, a new operation after undo clears redo', () => {
  let history = recordKitChange({ past: [], future: [] }, [camera], '数量', 'camera:qty');
  history = recordKitChange(history, [{ ...camera, qty: 4 }], '数量', 'camera:qty');
  assert.equal(history.past.length, 1);
  const undo = travelKitHistory(history, [{ ...camera, qty: 5 }], 'undo');
  history = recordKitChange(undo.history, undo.rows, '加入镜头');
  assert.equal(history.future.length, 0);
  assert.equal(history.past.length, 1);
});

test('history is bounded and preserves the most recent changes', () => {
  let history = { past: [], future: [] };
  for (let index = 0; index < 50; index++) history = recordKitChange(history, [{ ...camera, qty: index + 1 }], `change ${index}`);
  assert.equal(history.past.length, 30);
  assert.equal(history.past[0].rows[0].qty, 21);
});

test('camera change preview distinguishes removed, added and adjusted items', () => {
  const newCamera = { ...camera, id: 'replacement' };
  const changedLens = { ...lens, qty: 2 };
  const diff = describeKitChange([camera, lens], [newCamera, changedLens]);
  assert.deepEqual(diff.added, [newCamera]);
  assert.deepEqual(diff.removed, [camera]);
  assert.deepEqual(diff.changed, [changedLens]);
  assert.equal(camera.qty, 3);
});

test('one frame choice and one frame-rate control keep recommendations consistent', () => {
  assert.deepEqual(frameSelection('9:16'), { aspectRatio: '9:16', screenFormat: '竖屏' });
  assert.equal(frameSelection('横竖双构图').screenFormat, '横竖双版本');
  assert.equal(frameSelection('2.39:1').screenFormat, '横屏');
  assert.deepEqual(captureAtFrameRate(['稳定器', '高帧率', '高帧率'], 25, 120), ['稳定器', '高帧率']);
  assert.deepEqual(captureAtFrameRate(['稳定器', '高帧率'], 30, 0), ['稳定器']);
});

test('undoing regeneration restores the stale-requirements notice and redo clears it', () => {
  const history = recordKitChange({ past: [], future: [] }, [camera], '更新推荐', undefined, true);
  const updated = [camera, lens];
  const undo = travelKitHistory(history, updated, 'undo', false);
  assert.equal(undo.requirementsChanged, true);
  const redo = travelKitHistory(undo.history, undo.rows, 'redo', undo.requirementsChanged);
  assert.equal(redo.requirementsChanged, false);
  assert.deepEqual(redo.rows, updated);
});

test('undo and redo cannot overwrite a newer specification or review decision', () => {
  const original = [camera, lens];
  const changed = [{ ...camera, qty: 4 }, lens];
  const history = recordKitChange({ past: [], future: [] }, original, '数量', 'camera:qty', false, 0);
  // A later independent resolution edit marks requirements stale at revision 1.
  const undo = travelKitHistory(history, changed, 'undo', true, 1);
  assert.deepEqual(undo.rows, original);
  assert.equal(undo.requirementsChanged, true);
  // A later explicit review at revision 2 must also survive redo.
  const redo = travelKitHistory(undo.history, undo.rows, 'redo', false, 2);
  assert.deepEqual(redo.rows, changed);
  assert.equal(redo.requirementsChanged, false);
  const separateRevision = recordKitChange(history, changed, '数量', 'camera:qty', true, 1);
  assert.equal(separateRevision.past.length, 2);
});
