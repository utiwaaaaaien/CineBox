import assert from 'node:assert/strict';
import test from 'node:test';
import { suggestEquipment } from '../app/equipment-suggestions.ts';
import { publishedEquipment } from '../app/equipment-catalog.canonical.ts';

const record = (id, name, extra = {}) => ({ id, name, brand: 'SONY', category: '摄影机', unit: '台', ...extra });

test('equipment suggestions are empty until a meaningful query is entered', () => {
  for (const query of ['', '  ', '\t\n', '－ ／ _']) {
    assert.deepEqual(suggestEquipment([record('fx3', 'SONY FX3')], '摄影机', query), []);
  }
  assert.deepEqual(suggestEquipment([], '摄影机', 'FX3'), []);
  assert.deepEqual(suggestEquipment([record('fx3', 'SONY FX3')], '摄影机', '不存在型号'), []);
});

test('suggestions stay in the current category, exclude unpublished rows, and return original records', () => {
  const allowed = record('allowed', 'SONY FX3');
  const input = [record('other-category', 'SONY FX3', { category: '镜头' }), record('retired', 'SONY FX3', { published: false }), allowed];
  assert.deepEqual(suggestEquipment(input, '摄影机', 'FX3'), [allowed]);
  assert.equal(suggestEquipment(input, '摄影机', 'FX3')[0], allowed);
  assert.deepEqual(suggestEquipment(input, '录音器材', 'FX3'), []);
});

test('exact matches precede prefixes and substrings with stable directory order and a five-item limit', () => {
  const input = [
    record('contains', '专业 FX3 机身'),
    record('prefix-first', 'FX3 Pro'),
    record('prefix-second', 'FX3 Kit'),
    record('exact-name', 'FX3'),
    record('exact-alias', '索尼相机', { aliases: ['FX3'] }),
    record('sixth', 'FX3 Bundle'),
    record('seventh', 'FX3 Package'),
  ];
  const before = input.map(item => item.id);
  assert.deepEqual(suggestEquipment(input, '摄影机', 'FX3').map(item => item.id), ['exact-name', 'exact-alias', 'prefix-first', 'prefix-second', 'sixth']);
  assert.deepEqual(input.map(item => item.id), before);
});

test('NFKC, case, spacing, English names, brands and historical aliases remain searchable', () => {
  const sony = record('fx3', '索尼 ILME-FX3', { englishName: 'SONY FX3', aliases: ['索尼电影机'] });
  const rode = record('rode', '罗德 RØDE NTG5', { category: '录音器材', brand: 'RØDE', unit: '支' });
  for (const query of ['ＳＯＮＹ　ＦＸ３', 'sony-fx3', '索尼电影机', '  SONY  ']) {
    assert.deepEqual(suggestEquipment([sony, rode], '摄影机', query), [sony]);
  }
  for (const query of ['RODE', 'røde', 'ＲＯＤＥ ＮＴＧ５']) {
    assert.deepEqual(suggestEquipment([sony, rode], '录音器材', query), [rode]);
  }
});

test('model generations keep distinct identities and the explicit generation ranks first', () => {
  const third = record('camera-iii', 'SONY A7 III', { aliases: ['A7 III'] });
  const second = record('camera-ii', 'SONY A7 II', { aliases: ['A7 II'] });
  const results = suggestEquipment([third, second], '摄影机', 'a7 ii');
  assert.equal(results[0], second);
  assert.equal(new Set(results.map(item => item.id)).size, 2);
  const gimbals = [record('rs3', 'DJI RS 3 Pro', { category: '移动器材', brand: 'DJI' }), record('rs4', 'DJI RS 4 Pro', { category: '移动器材', brand: 'DJI' })];
  assert.deepEqual(suggestEquipment(gimbals, '移动器材', 'RS4').map(item => item.id), ['rs4']);
});

test('real published catalogue suggestions resolve a common microphone spelling without changing identity', () => {
  const results = suggestEquipment(publishedEquipment, '录音器材', 'rode');
  assert.ok(results.length > 0 && results.length <= 5);
  assert.ok(results.every(item => item.category === '录音器材' && publishedEquipment.includes(item)));
});

test('custom equipment suggestions find both keyword orders and normalized zoom ranges', () => {
  for (const query of ['索尼 24-70', '24-70 索尼', '索尼　２４ｍｍ—７０ｍｍ']) {
    const suggestions = suggestEquipment(publishedEquipment, '镜头', query);
    assert.ok(suggestions.some((item) => item.id === 'lens-sony-2470'));
    assert.ok(suggestions.every((item) => item.brand === 'SONY' && item.name.includes('24-70mm')));
  }
  for (const query of ['阿莱 LF', 'LF 阿莱']) {
    const suggestions = suggestEquipment(publishedEquipment, '摄影机', query);
    assert.ok(suggestions.some((item) => item.id === 'cam-alexa-lf'));
    assert.ok(suggestions.some((item) => item.id === 'cam-alexa-mini-lf'));
    assert.ok(suggestions.every((item) => item.brand === 'ARRI'));
  }
});
