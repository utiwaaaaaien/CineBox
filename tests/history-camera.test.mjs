import assert from 'node:assert/strict';
import test from 'node:test';
import { historyCameraModel } from '../app/history-camera.ts';
import { canonicalEquipment, canonicalEquipmentRedirects } from '../app/equipment-catalog.canonical.ts';

const catalog = new Map(canonicalEquipment.map(item => [item.id, item]));
for (const [oldId, newId] of Object.entries(canonicalEquipmentRedirects)) {
  if (catalog.has(newId)) catalog.set(oldId, catalog.get(newId));
}

test('history shows a short regular camera model before an auxiliary camera', () => {
  const auxiliary = { name: 'DJI Mavic 3', category: '摄影机', subcategory: '航拍无人机' };
  assert.equal(historyCameraModel([{ id: 'custom-drone', custom: auxiliary }, { id: 'cam-sony-fx3' }], catalog), 'FX3');
  const arri = canonicalEquipment.find(item => item.category === '摄影机' && item.series === 'ALEXA' && item.model === '35');
  assert.ok(arri);
  assert.equal(historyCameraModel([{ id: arri.id }], catalog), 'ALEXA 35');
});

test('history can show a custom camera and leaves missing cameras blank', () => {
  assert.equal(historyCameraModel([{ id: 'custom', custom: { name: '自备摄影机', category: '摄影机' } }], catalog), '自备摄影机');
  assert.equal(historyCameraModel([{ id: 'unresolved' }], catalog), '');
  assert.equal(historyCameraModel([], catalog), '');
});

test('history keeps the first regular camera and preserves list contents', () => {
  const other = canonicalEquipment.find(item => item.category === '摄影机' && item.series === 'ALEXA' && item.model === '35');
  const rows = [{ id: 'cam-sony-fx3', qty: 2, note: '保持备注' }, { id: other.id, qty: 1 }];
  const before = JSON.stringify(rows);
  assert.equal(historyCameraModel(rows, catalog), 'FX3');
  assert.equal(JSON.stringify(rows), before);
});
