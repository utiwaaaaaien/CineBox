import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { canonicalEquipment as rows, canonicalEquipmentRedirects as redirects } from "../app/equipment-catalog.canonical.ts";
import { applyReleaseReview } from "../scripts/catalog-release-review.mjs";
import { normalizeEquipment, mergeEquipment } from "../scripts/catalog-naming.mjs";
import { resolveCatalogId, migrateCatalogKit, migrateCatalogProjects, migrateCatalogHistory } from "../app/catalog-identity.ts";
import { buildEquipmentSeries } from "../app/equipment-series.ts";

const byId = new Map(rows.map(row => [row.id, row]));
const sample = (id, name, overrides = {}) => ({ id, name, brand: "ARRI", category: "镜头", subcategory: "定焦镜头", unit: "颗", costTier: 2, aliases: [], verified: true, ...overrides });
const [oldId, retainedId] = Object.entries(redirects)[0];

test("V5 outputs are current and every original inventory identity still resolves", () => {
  execFileSync(process.execPath, ["scripts/build-canonical-catalog.mjs", "--check"], { cwd: new URL("../", import.meta.url), stdio: "pipe" });
  const inventory = JSON.parse(fs.readFileSync(new URL("../data/catalog/v4-inventory.json", import.meta.url))).rows;
  const repairs = JSON.parse(fs.readFileSync(new URL("../data/catalog/inventory-repairs.json", import.meta.url)));
  for (const row of [...inventory, ...repairs.additions]) assert.ok(byId.has(resolveCatalogId(row.id)), row.id);
  for (const [removed, retained] of Object.entries(redirects)) {
    assert.ok(!byId.has(removed)); assert.ok(byId.has(retained));
    assert.equal(resolveCatalogId(retained), retained);
  }
});

test("official verification always has model evidence and structured names follow the required order", () => {
  for (const row of rows) {
    assert.equal(row.name, [row.brandZh, row.brandEn, row.series, row.model].filter(Boolean).join(" "));
    assert.equal(row.verified, row.namingStatus === "official-model");
    if (row.verified) assert.ok(row.references.some(ref => ref.scope === "model" && ref.url.startsWith("https://")), row.id);
  }
  assert.equal(byId.get("cam-sony-venice2").name, "索尼 SONY CineAltaV 2");
  assert.ok(byId.get("cam-sony-venice2").aliases.some(alias => /VENICE/i.test(alias)));
  assert.equal(byId.get("lens-thypoch-simera-c-16-e").name, "叙 Thypoch 瞬 16mm T1.9 E口");
  assert.equal(byId.get("v5-restored-10").name, "耐司 NiSi 雅典娜 35mm T1.9");
  assert.equal(byId.get("lens-dzo-gnosis").name, "东正 DZOFILM 观 90mm T2.8");
});

test("deduplication keeps aperture, mount, generation, focal length, filter size and density", () => {
  const names = ["ARRI Master Prime 35mm T1.3", "ARRI Master Prime 35mm T1.3 PL", "ARRI Master Prime 35mm T1.3 E", "ARRI Master Prime 35mm T1.4", "ARRI Master Prime 50mm T1.3", "ARRI Master Prime II 35mm T1.3"];
  const fixtures = names.map((name, index) => normalizeEquipment(sample(`fixture-${index}`, name)));
  fixtures.push(...["ND 4x5.65 0.3", "ND 4x5.65 0.6", "ND 4x4 0.3", "IRND 4x5.65 0.3", "ND 4x5.65 0.3 Soft Grad"].map((name, i) => normalizeEquipment(sample(`filter-${i}`, name, { brand: "通用", category: "滤镜" }))));
  const duplicate = normalizeEquipment(sample("eq-duplicate", "ARRI / ZEISS Master Prime 35mm/T1.3"));
  const merged = mergeEquipment([...fixtures, duplicate]);
  assert.equal(merged.rows.length, fixtures.length);
  assert.equal(merged.redirects[duplicate.id], "fixture-0");
  const series = buildEquipmentSeries(fixtures).find(row => row.name === "Master Prime");
  assert.equal(series.items.length, names.length, "same focal length must not hide other specifications");
});

test("unknown or conflicting specifications cannot inherit V4 verified flags", () => {
  const wrong = normalizeEquipment(sample("wrong", "NiSi ATHENA 35mm T1.4", { brand: "NiSi" }));
  assert.equal(wrong.namingStatus, "pending");
  assert.equal(wrong.verified, false);
  assert.match(wrong.name, /T1.4/);
  assert.ok(wrong.reviewNotes.some(note => note.includes("T1.9")));
  const mount = normalizeEquipment(sample("mount", "ARRI Master Prime 35mm T1.3 E口"));
  assert.equal(mount.namingStatus, "official-series"); assert.equal(mount.verified, false);
  const unknown = normalizeEquipment(sample("unknown", "UNKNOWN 35mm T1.3", { brand: "UNKNOWN" }));
  assert.equal(unknown.namingStatus, "pending"); assert.equal(unknown.brandZh, "");
  const supreme = byId.get(resolveCatalogId("v5-restored-13"));
  assert.equal(supreme.namingStatus, "official-model");
  assert.match(supreme.name, /200mm T2.2/);
  assert.ok(supreme.aliases.some(alias => /200mm T2.1/.test(alias)));
});

test("restored accessories, lens sets and filter specifications do not remain aliases of unrelated products", () => {
  assert.ok(!byId.get("cam-alexa-35").aliases.some(alias => /Signature Prime/i.test(alias)));
  for (const id of ["cam-alexa-lf", "cam-alexa-mini", "cam-alexa-mini-lf"]) assert.ok(!byId.get(id).aliases.some(alias => /EVF|Nauticam/i.test(alias)), id);
  for (const id of ["v5-restored-1", "v5-restored-2", "v5-restored-3", "v5-restored-4"]) assert.equal(byId.get(id).category, "摄影机附件");
  assert.equal(byId.get("v5-restored-2").brand, "Nauticam");
  assert.equal(byId.get("v5-restored-2").name, "Nauticam ALEXA Mini 潜水壳");
  assert.equal(byId.get("lens-nisi-athena").unit, "组");
  for (const id of ["v5-restored-8", "v5-restored-9", "v5-restored-10", "v5-restored-11", "v5-restored-12"]) assert.equal(byId.get(id).unit, "颗");
  assert.ok(rows.some(row => /Type EZ-1 30-90mm T2/.test(row.name)));
  assert.ok(rows.some(row => /Type EZ-1 45-135mm T3/.test(row.name)));
  assert.ok(!byId.get("lens-sony-85").aliases.some(alias => /GM II/i.test(alias)));
  const lights = ["Aputure LS 300x", "Aputure LS 600x"].map((name, i) => normalizeEquipment(sample(`light-${i}`, name, { brand: "Aputure", category: "灯光器材" })));
  assert.equal(mergeEquipment(lights).rows.length, 2);
});

test("merged projects preserve quantity, notes and conflicting decisions in either input order", () => {
  const first = { id: oldId, qty: 2, note: "A机", reason: "手选", status: "confirmed", userAdjusted: true };
  const second = { id: retainedId, qty: 3, note: "B机", reason: "推荐", status: "recommended" };
  for (const input of [[first, second], [second, first]]) {
    const [merged] = migrateCatalogKit(input);
    assert.equal(merged.id, retainedId); assert.equal(merged.qty, 5);
    assert.ok(merged.note.includes("A机") && merged.note.includes("B机"));
    assert.equal(merged.status, "pending"); assert.equal(merged.userAdjusted, true);
    assert.deepEqual(migrateCatalogKit([merged]), [merged]);
    assert.equal(input[0].qty, input[0] === first ? 2 : 3);
  }
  const [project] = migrateCatalogProjects([{ id: "project", form: { name: "旧项目" }, kit: [first, second] }]);
  assert.equal(project.kit.length, 1); assert.equal(project.kit[0].qty, 5);
});

test("migration bounds malformed quantities and keeps custom equipment", () => {
  const custom = { id: "custom-light", qty: 4, custom: { name: "自备灯" }, note: "自备" };
  const migrated = migrateCatalogKit([null, [], 3, { id: oldId, qty: 900 }, { id: retainedId, qty: 900 }, custom]);
  assert.equal(migrated[0].qty, 999); assert.match(migrated[0].note, /1800/);
  assert.deepEqual(migrated[1], custom);
  assert.equal(migrateCatalogKit([{ id: oldId, qty: Infinity }, { id: retainedId, qty: NaN }])[0].qty, 2);
  assert.equal(migrateCatalogKit([{ id: oldId, qty: 2 }, { id: oldId, qty: 2 }]).length, 1);
  assert.equal(resolveCatalogId("__proto__"), "__proto__");
});

test("saved history merges redirected quantities and ignores inherited object properties", () => {
  const input = { history: { projectName: "历史项目", items: [oldId, retainedId, oldId], quantities: { [oldId]: 2, [retainedId]: 3 } } };
  const migrated = migrateCatalogHistory(input);
  assert.deepEqual(migrated.history.items, [retainedId]);
  assert.equal(migrated.history.quantities[retainedId], 5);
  assert.equal(migrated.history.projectName, "历史项目");
  assert.deepEqual(migrateCatalogHistory(migrated), migrated);
  const prototype = migrateCatalogHistory({ p: { items: ["constructor", "__proto__"], quantities: {} } });
  assert.equal(prototype.p.quantities.constructor, 1); assert.equal(prototype.p.quantities.__proto__, 1);
});

test("release eligibility keeps useful identities independently of manufacturer verification", () => {
  const published = JSON.parse(fs.readFileSync(new URL('../data/catalog/published.v5.json', import.meta.url))).rows;
  assert.deepEqual(published.map(row => row.id), rows.filter(row => row.published).map(row => row.id));
  for (const row of published) {
    assert.ok(['official-model','official-series','generic-function','specific-inventory','user-retained-name'].includes(row.identityBasis), row.name);
    assert.ok(row.englishName && !/[\u3400-\u9fff]|待确认|待核验/.test(row.englishName), row.name);
    assert.doesNotMatch(row.name, /待确认|待核验/);
    if (row.namingStatus === 'official-model') assert.ok(row.references.some(ref => ref.scope === 'model'));
  }
  assert.ok(published.some(row => row.namingStatus === 'pending' && !row.verified));
  assert.ok(published.some(row => row.namingStatus === 'official-series' && !row.verified));
  for (const row of rows.filter(row => !row.published)) assert.ok(['unusable','superseded-for-selection'].includes(row.identityBasis));
  assert.ok(rows.find(row => row.id === 'cam-sony-venice2').englishName.includes('VENICE 2'));
});

test("known products with small specification conflicts are corrected and selectable", () => {
  const expected = [
    [/Master Anamorphic 2×180mm T2.8/, /180mm T1.9/],
    [/Supreme Prime 200mm T2.2/, /200mm T2.1/],
    [/FF High Speed Prime 14mm T2$/, /14mm T1.5/],
    [/Anamorphic\/i FF 1.8×100mm T2.3/, /2[x×].*100mm/],
    [/CN-E 50mm T1.3 FP X/, /CN-E 50mm T1.5 FP X/],
    [/CN-E 85mm T1.3 FP X/, /CN-E 85mm T1.5 FP X/],
  ];
  for (const [name, oldName] of expected) {
    const row = rows.find(row => name.test(row.name));
    assert.ok(row, String(name)); assert.equal(row.published, true); assert.equal(row.verified, true);
    assert.ok(row.aliases.some(alias => oldName.test(alias)), row.name);
    assert.ok(row.reviewCorrections.some(correction => oldName.test(correction.originalName) && correction.source.startsWith('https://')));
  }
  const master = applyReleaseReview(normalizeEquipment(sample('master-conflict','ARRI Master Anamorphic 180mm T1.9')));
  assert.match(master.name, /180mm T2.8/); assert.equal(master.published, true); assert.equal(master.verified, true);
  assert.ok(master.aliases.some(alias => /180mm T1.9/.test(alias)));
  const retained = resolveCatalogId('v5-restored-13');
  const [migrated] = migrateCatalogKit([{id:'v5-restored-13',qty:2,note:'旧 T2.1 写法'}, {id:retained,qty:3,note:'官网 T2.2'}]);
  assert.equal(migrated.id, retained); assert.equal(migrated.qty, 5);
  assert.ok(migrated.note.includes('旧 T2.1') && migrated.note.includes('官网 T2.2'));
});

test("vague product names stay recoverable while concrete inventory descriptions remain selectable", () => {
  for (const [name, brand, category] of [['录音机','通用','录音器材'], ['蔡司镜头','ZEISS','镜头'], ['某品牌小监视器','通用','监看']]) {
    const row = applyReleaseReview(normalizeEquipment(sample(`vague-${brand}`, name, {brand,category})));
    assert.equal(row.published, false, name);
  }
  const archived = rows.find(row => row.id === 'video-smallhd-unspecified');
  assert.equal(archived.published, true);
  const original = {id:archived.id,qty:3,note:'已有项目',status:'confirmed'};
  assert.deepEqual(migrateCatalogKit([original]), [original]);
  const housing = rows.find(row => row.id === 'v5-restored-2');
  assert.equal(housing.published, true); assert.equal(housing.verified, false);
  assert.equal(rows.find(row => row.id === 'lens-nisi-athena').published, true);
  const nanlux = rows.find(row => row.brand === 'NANLUX' && row.model === 'Evoke 900C');
  assert.ok(nanlux.published); assert.ok(nanlux.aliases.some(alias => /Nanlite|南光/.test(alias)));
});

test('latest series choices are dated new identities and preserve old project equipment', () => {
  const choices={
    'cam-dji-mavic-unspecified':['v5-dji-mavic-4-pro'],
    'cam-dji-osmo-action-unspecified':['v5-dji-osmo-action-6'],
    'cam-dji-osmo-pocket-unspecified':['v5-dji-osmo-pocket-4p'],
    'grip-dji-rs-unspecified':['v5-dji-rs-5'],
    'eq-laowa-laowa-镜头':['v5-laowa-probe-zoom-15-24','v5-laowa-probe-zoom-15-35'],
  };
  for(const [old, latest] of Object.entries(choices)) {
    const archived=byId.get(old);
    assert.equal(archived.published,false);assert.equal(archived.identityBasis,'superseded-for-selection');
    assert.deepEqual(archived.replacementIds,latest);
    assert.equal(resolveCatalogId(old),old);
    const saved={id:old,qty:2,note:'旧项目未指定型号',status:'confirmed'};
    assert.deepEqual(migrateCatalogKit([saved]),[saved]);
    for(const id of latest) {
      const row=byId.get(resolveCatalogId(id));
      assert.equal(row.published,true);assert.equal(row.verified,true);
      assert.equal(row.reviewedAt,'2026-10-07');
      assert.ok(row.references.some(r=>r.scope==='model'&&r.language==='zh-CN'));
    }
  }
  const probes=choices['eq-laowa-laowa-镜头'].map(id=>byId.get(id));
  assert.equal(buildEquipmentSeries(probes)[0].name,'MACRO PROBE ZOOM');
  assert.match(probes[0].name,/15-24mm T8 1.6× Macro/);
  assert.match(probes[1].name,/15-35mm T12 2.3× Macro/);
});

test('abbreviations deduplicate exact lenses and separate unrelated aliases', () => {
  const fixtures=['ARRI MP 35mm T1.3','ARRI Master Prime 35mm T1.3','ARRI SP 47mm T1.8','ARRI UP 24mm T1.9'].map((name,i)=>applyReleaseReview(normalizeEquipment(sample(`abbr-${i}`,name))));
  assert.equal(mergeEquipment(fixtures).rows.length,3);
  assert.equal(fixtures[0].name,fixtures[1].name);
  assert.equal(byId.get('eq-arri-arri-mp-镜头').unit,'组');
  assert.ok(!byId.get('eq-arri-arri-mp-镜头').aliases.some(a=>a.includes('百微')));
  assert.ok(byId.get('eq-arri-arri-master-macro-100mm-t2-0-镜头').aliases.includes('ARRI MP百微'));
  assert.ok(!byId.get('grip-howmoco').aliases.some(a=>/FILMOTECHNIC|MOVIE BIRD/.test(a)));
  const kits=['v5-aputure-b7c-8-kit','v5-aputure-mc-12-kit'].map(id=>byId.get(id));
  assert.ok(kits.every(r=>r.published&&r.verified));
  assert.notEqual(kits[0].name,kits[1].name);
});

test('retained original names and accessories do not claim invented manufacturer models', () => {
  for(const id of ['eq-lensbaby-lensbaby-镜头','filter-kaleidoscope','filter-peacock-flare','eq-通用-采集卡-其他','eq-通用-章鱼时码器-录音器材','eq-sony-索尼大监视器-监看','video-smallhd-unspecified']) {
    const row=byId.get(id);assert.equal(row.published,true,id);assert.equal(row.verified,false,id);
    assert.doesNotMatch(row.name,/待核验|待确认/);
  }
  assert.equal(byId.get('eq-lensbaby-lensbaby-镜头').name,'Lensbaby');
  assert.equal(byId.get('filter-kaleidoscope').englishName,'Kaleidoscope Filter');
  assert.equal(byId.get('eq-通用-采集卡-其他').englishName,'Capture Card');
  for(const id of ['light-rgb-tube-unspecified','light-led-mat-unspecified','light-led-on-camera-bicolor','eq-通用-锐鹰rgb大布灯-灯光器材'])assert.equal(byId.get(id).published,false,id);
  for(const id of ['eq-nanlite-led-rgb-1-灯光器材','eq-通用-锐鹰18td小布灯-灯光器材'])assert.equal(byId.get(id).published,true,id);
});

test("official corrections do not invent mount configurations or conflate them", () => {
  const fixtures = ['ARRI Master Prime 35mm T1.4 PL口', 'ARRI Master Prime 35mm T1.4 E口'].map((name, i) => applyReleaseReview(normalizeEquipment(sample(`mount-${i}`,name))));
  for (const row of fixtures) {
    assert.match(row.name, /35mm T1.3/); assert.equal(row.published, true);
    assert.equal(row.verified, false); assert.equal(row.namingStatus, 'official-series');
  }
  assert.match(fixtures[0].name, /PL口/); assert.match(fixtures[1].name, /E口/);
  assert.equal(mergeEquipment(fixtures).rows.length, 2);
});
