import assert from 'node:assert/strict';
import test from 'node:test';
import { categoryBrands, filterCatalog, copyHistoricalKit, basicSystemProject } from '../app/direct-selection.ts';
import { publishedEquipment, canonicalEquipment, canonicalBrandLabels } from '../app/equipment-catalog.canonical.ts';
import { buildCameraSystemChecks } from '../app/camera-system-rules.ts';
import { buildEquipmentWorkbook } from '../app/excel-export.ts';
import { sanitizeProjectRecords } from '../app/project-state.ts';
import { brandMenuLabels } from '../app/catalog-brands.ts';
import { buildEquipmentSeries } from '../app/equipment-series.ts';

const project = { name: 'V5.5 回归', type: '剧情片', shootDate: '2026-10-07', days: 3, cameraCount: 2, dop: '', contact: '', notes: '', scale: '完整', monitoring: '完整监看', captureStyle: ['高帧率', '轨道车'], sceneConditions: ['反光材质', '风沙/飞沫'], baseFps: 25, highSpeedFps: 0, resolution: '6K', aspectRatio: '2.39:1', screenFormat: '横屏', powerAccess: '无市电', narrativeViewpoint: '人物主观', visualTone: '低饱和柔和', contrastStyle: '高反差', movementIntent: '人物跟随' };
const catalogMap = new Map(canonicalEquipment.map((item) => [item.id, item]));

test('brand menu contains exactly the brands in the selected published category', () => {
  for (const category of ['摄影机', '镜头', '灯光器材']) {
    const brands = categoryBrands(publishedEquipment, category, canonicalBrandLabels);
    assert.equal(brands[0], '全部');
    assert.deepEqual(new Set(brands.slice(1)), new Set(publishedEquipment.filter((item) => item.category === category).map((item) => item.brand)));
    for (const brand of brands.slice(1)) {
      const matches = filterCatalog(publishedEquipment, { category, brand, query: '', namingFilter: '全部' });
      assert.ok(matches.length);
      assert.ok(matches.every((item) => item.category === category && item.brand === brand && item.published));
    }
  }
});

test('common brands have category-specific priority and translated menu labels preserve identities', () => {
  assert.deepEqual(categoryBrands(publishedEquipment, '摄影机', canonicalBrandLabels).slice(0, 5), ['全部', 'ARRI', 'SONY', 'RED', 'Canon']);
  assert.deepEqual(categoryBrands(publishedEquipment, '镜头', canonicalBrandLabels).slice(0, 5), ['全部', 'Cooke', 'ZEISS', 'Angénieux', 'Leica']);
  const labels = brandMenuLabels(publishedEquipment);
  assert.equal(labels.ARRI, 'ARRI｜阿莱');
  assert.equal(labels.RED, 'RED');
  assert.equal(labels['Angénieux'], 'Angénieux｜安琴');
  assert.equal(labels.Leitz, 'Leitz｜徕兹');
  assert.equal(labels.Tiffen, 'Tiffen｜蒂芬');
  assert.equal(labels.NANLUX, 'NANLUX');
  const officialNameMatches = filterCatalog(publishedEquipment, { category: '滤镜', brand: 'Tiffen', query: '蒂芬', namingFilter: '全部' });
  assert.ok(officialNameMatches.length);
  assert.equal(labels.RØDE, 'RØDE');
  assert.equal(labels['通用'], '通用');
  const before = JSON.stringify(publishedEquipment);
  brandMenuLabels(publishedEquipment);
  assert.equal(JSON.stringify(publishedEquipment), before);
  assert.ok(filterCatalog(publishedEquipment, { category: '摄影机', brand: 'RED', query: '', namingFilter: '全部' }).length);
  assert.ok(filterCatalog(publishedEquipment, { category: '全部', brand: '全部', query: '瑞德', namingFilter: '全部' }).every((item) => item.brand === 'RED'));
  assert.ok(filterCatalog(publishedEquipment, { category: '全部', brand: '全部', query: '瑞德', namingFilter: '全部' }).length);
});

test('search preserves English and old aliases and retains non-lens order', () => {
  const item = publishedEquipment.find((item) => item.aliases?.length && item.englishName);
  for (const query of [item.englishName, item.aliases[0]]) {
    assert.ok(filterCatalog(publishedEquipment, { category: '全部', brand: '全部', query, namingFilter: '全部' }).some((match) => match.id === item.id));
  }
  const all = filterCatalog(publishedEquipment, { category: '全部', brand: '全部', query: '', namingFilter: '全部' });
  assert.deepEqual(new Set(all), new Set(publishedEquipment));
  assert.deepEqual(all.filter((item) => item.category !== '镜头'), publishedEquipment.filter((item) => item.category !== '镜头'));
});

test('catalogue keyword search combines brand and model in any order without mistaking a longer focal length for the query', () => {
  const search = (query) => filterCatalog(publishedEquipment, { category: '全部', brand: '全部', query, namingFilter: '全部' }).map((item) => item.id);
  const sony = search('索尼 24-70');
  assert.ok(sony.includes('lens-sony-2470'));
  assert.ok(sony.every((id) => catalogMap.get(id).brand === 'SONY' && catalogMap.get(id).name.includes('24-70mm')));
  for (const query of ['24-70 索尼', '２４ｍｍ – ７０ｍｍ　索尼', '索尼２４－７０']) {
    assert.deepEqual(search(query), sony);
  }
  const arri = search('阿莱 LF');
  assert.ok(arri.includes('cam-alexa-lf') && arri.includes('cam-alexa-mini-lf'));
  assert.deepEqual(search('LF 阿莱'), arri);
  assert.ok(!arri.includes('cam-alexa-mini'));
  assert.ok(search('索尼 FX').includes('cam-sony-fx3'));
});

test('lenses sort by focal length and then the zoom endpoint, keeping accessories without a focal length at the end', () => {
  const names = ['ARRI Master Prime 100mm T1.3', 'ARRI Master Prime 9.5mm T2.8', 'ARRI Master Prime 9mm T2.8',
    'ARRI Master Prime 9–18mm', 'ARRI Master Prime 9–14mm', 'ARRI Master Prime 1.4× Extender'];
  const items = names.map((name, index) => ({ name, id: `example-${index}`, brand: 'ARRI', category: '镜头', aliases: [] }));
  const original = items.slice();
  const ordered = [2, 4, 3, 1, 0, 5].map((index) => items[index].id);
  const matches = filterCatalog(items, { category: '镜头', brand: '全部', query: '', namingFilter: '全部' });
  assert.deepEqual(matches.map((item) => item.id), ordered);
  assert.deepEqual(buildEquipmentSeries(items)[0].items.map((item) => item.id), ordered);
  assert.deepEqual(items, original);
});

test('history copying preserves original quantities and retired identities without camera scaling', () => {
  const archived = canonicalEquipment.find((item) => !item.published);
  const profile = { label: '历史', projectName: '原项目', items: ['cam-alexa-mini-lf', archived.id, 'missing-id'], quantities: { 'cam-alexa-mini-lf': 3, [archived.id]: 4 } };
  const rows = copyHistoricalKit(profile, catalogMap);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].qty, 3);
  assert.equal(rows[1].id, archived.id);
  assert.equal(rows[1].qty, 4);
  assert.equal(rows[0].status, 'pending');
});

test('old questionnaire preferences do not affect manual compatibility checks', () => {
  const kit = [{ id: 'cam-alexa-mini-lf', qty: 2 }, { id: 'lens-zeiss-supreme', qty: 1 }];
  const neutral = { ...project, scale: '轻量', monitoring: '精简监看', captureStyle: [], sceneConditions: [], powerAccess: '稳定市电' };
  const checks = buildCameraSystemChecks(basicSystemProject(project), kit, canonicalEquipment);
  assert.deepEqual(checks, buildCameraSystemChecks(basicSystemProject(neutral), kit, canonicalEquipment));
  assert.ok(!checks.some((check) => ['filter-protection', 'set-support'].includes(check.id)));
  assert.ok(checks.some((check) => check.id === 'multi-camera-sync'));
  assert.deepEqual(buildCameraSystemChecks(basicSystemProject({ ...project, highSpeedFps: 120 }), kit, canonicalEquipment), checks);
  assert.ok(!JSON.stringify(checks).includes('10:1'));
});

test('export contains visible project data and excludes removed creative defaults', () => {
  const workbook = buildEquipmentWorkbook(project, [{ name: '摄影机', rows: [{ name: '测试机身', qty: 2, unit: '台', note: 'A / B' }] }]);
  const text = JSON.stringify(workbook);
  for (const value of ['V5.5 回归', '2026.10.07-10.09', '6K', '2.39:1', '25fps']) assert.ok(text.includes(value), value);
  for (const value of ['人物主观', '低饱和柔和', '高反差', '人物跟随', '风沙/飞沫', '系统建议', '摄影决策摘要']) assert.ok(!text.includes(value), value);
});

test('confirmation survives reload and old projects with kits remain accessible', () => {
  const options = { defaultForm: { name: '新项目' }, isKnownEquipmentId: () => true, isCategory: () => true, createId: () => 'generated' };
  const kit = [{ id: 'cam-alexa-mini-lf', qty: 2, note: '旧备注', reason: '旧项目' }];
  const old = sanitizeProjectRecords([{ id: 'old', form: { name: '旧项目' }, kit }], options)[0];
  assert.equal(old.basicInfoConfirmed, true);
  assert.equal(old.kit[0].qty, 2);
  assert.equal(old.kit[0].note, '旧备注');
  const copy = sanitizeProjectRecords([{ id: 'copy', form: { name: '复用项目' }, kit, basicInfoConfirmed: false }], options)[0];
  assert.equal(copy.basicInfoConfirmed, false);
  const confirmed = sanitizeProjectRecords([{ ...copy, basicInfoConfirmed: true }], options)[0];
  assert.equal(confirmed.basicInfoConfirmed, true);
});


test('historical redirect collisions merge quantities into the current identity', () => {
  const item = catalogMap.get('cam-alexa-mini-lf');
  const map = new Map([...catalogMap, ['legacy-camera', item]]);
  const rows = copyHistoricalKit({ label: '历史', items: [item.id, 'legacy-camera'], quantities: { [item.id]: 2, 'legacy-camera': 3 } }, map);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, item.id);
  assert.equal(rows[0].qty, 5);
});
