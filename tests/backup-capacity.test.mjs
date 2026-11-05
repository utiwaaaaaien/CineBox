import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeHistoryOverrides, maxHistoryOverrides } from '../app/project-history.ts';
import { historyCapacityError } from '../app/project-state.ts';

const cameraId = 'camera';
const makeHistory = (count) => Object.fromEntries(Array.from({ length: count }, (_, index) => {
  const id = `imported-history-1762228800000-${index.toString(36)}`;
  return [id, { id, type: 'TVC', items: [cameraId], source: { format: 'JSON', fileName: `${index}.json` } }];
}));

test('history restoration preserves every valid record so overflow is rejected before a backup merge', () => {
  const current = makeHistory(501);
  const restored = sanitizeHistoryOverrides(JSON.parse(JSON.stringify(current)), new Set(), new Set([cameraId]));
  assert.equal(Object.keys(restored).length, 501);
  assert.ok(historyCapacityError({}, restored, maxHistoryOverrides));
  assert.equal(historyCapacityError({}, makeHistory(500), maxHistoryOverrides), null);
  assert.equal(Object.keys(current).length, 501);
  assert.ok(restored['imported-history-1762228800000-dw']);
});

test('invalid history entries do not consume capacity or hide valid entries beyond position 500', () => {
  const restored = sanitizeHistoryOverrides({ ...Object.fromEntries(Array.from({length: 501}, (_, i) => [`invalid-${i}`, {}])), ...makeHistory(1) }, new Set(), new Set([cameraId]));
  assert.equal(Object.keys(restored).length, 1);
  assert.equal(historyCapacityError({}, restored, maxHistoryOverrides), null);
});
