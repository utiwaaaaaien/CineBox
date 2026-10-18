import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeProjectRecords } from '../app/project-state.ts';
import { completeKitAdditions, frameSelection, recordKitChange, travelKitHistory } from '../app/kit-workflow.ts';

test('fractional and custom specifications survive browser restore and backup roundtrip', () => {
  const options = {
    defaultForm: { name: '', baseFps: 25, highSpeedFps: 0, resolution: '4K', aspectRatio: '16:9', days: 1 },
    numericBounds: { baseFps: [1,1000], highSpeedFps: [0,10000], days: [1,60] },
    numericPrecision: { baseFps: 3, highSpeedFps: 3 },
    isKnownEquipmentId: () => true, isCategory: () => true, createId: () => 'new',
  };
  for (const baseFps of [23.976, 29.97, 47.952, 59.94, 27.5]) {
    const input = [{ id: 'custom', form: { baseFps, highSpeedFps: 119.88, resolution: '2880 × 1920', aspectRatio: '2.20:1', days: 2.4 }, kit: [] }];
    const [restored] = sanitizeProjectRecords(JSON.parse(JSON.stringify(input)), options);
    assert.equal(restored.form.baseFps, baseFps);
    assert.equal(restored.form.highSpeedFps, 119.88);
    assert.equal(restored.form.resolution, '2880 × 1920');
    assert.equal(restored.form.aspectRatio, '2.20:1');
    assert.equal(restored.form.days, 2);
  }
});

test('one-click completion deduplicates shared requirements and preserves existing decisions', () => {
  const before = [{ id: 'battery', qty: 2, note: '保留备注', reason: '用户选择', status: 'confirmed' }, { id: 'monitor', qty: 4, note: '客户', reason: '手动', status: 'manual' }];
  const additions = [{ id: 'battery', qty: 4, note: '系统备注', reason: '规则', status: 'pending' }, { id: 'battery', qty: 6, note: '', reason: '另一规则', status: 'pending' }, { id: 'monitor', qty: 2, note: '', reason: '规则', status: 'pending' }, { id: 'media', qty: 2, note: '', reason: '规则', status: 'pending' }, { id: 'media', qty: 2, note: '', reason: '另一规则', status: 'pending' }];
  const after = completeKitAdditions(before, additions);
  assert.equal(after.length, 3);
  assert.equal(after[0].qty, 6);
  assert.equal(after[0].note, '保留备注');
  assert.equal(after[0].reason, '用户选择');
  assert.equal(after[0].status, 'pending');
  assert.deepEqual(after[1], before[1]);
  assert.equal(after[2].qty, 2);
  assert.equal(before[0].qty, 2);
  assert.deepEqual(completeKitAdditions(after, additions), after);
  const history = recordKitChange({past: [], future: []}, before, '一键补齐');
  const undo = travelKitHistory(history, after, 'undo');
  assert.deepEqual(undo.rows, before);
  assert.deepEqual(travelKitHistory(undo.history, before, 'redo').rows, after);
});

test('custom vertical framing updates the project orientation', () => {
  assert.equal(frameSelection('4:5').screenFormat, '竖屏');
  assert.equal(frameSelection('3:4').screenFormat, '竖屏');
  assert.equal(frameSelection('2.20:1').screenFormat, '横屏');
  assert.equal(frameSelection('横竖双构图').screenFormat, '横竖双版本');
});
