import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {canonicalEquipment as rows, canonicalEquipmentVersion, canonicalEquipmentStats} from '../app/equipment-catalog.canonical.ts';
import {resolveCatalogId, migrateCatalogKit} from '../app/catalog-identity.ts';
import {classifyEquipment} from '../app/equipment-attributes.ts';
import {applyFinalCatalogReview, finalReview} from '../scripts/catalog-final-review.mjs';

const read=path=>JSON.parse(fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const additions=read('data/catalog/catalog-additions.v5.1.json').rows;
const baseline=read('data/catalog/v5-baseline-identities.json').rows;
const get=id=>rows.find(row=>row.id===resolveCatalogId(id));

test('V5.1 preserves every V5 identity and old search name',()=>{
 assert.equal(canonicalEquipmentVersion,'V5.1');
 for(const old of baseline){
  const current=get(old.id); assert.ok(current,old.id);
  if(current.name!==old.name)assert.ok(current.aliases.includes(old.name),old.name);
 }
});

test('manufacturer additions are released and have item-level evidence; no C3 record is introduced',()=>{
 for(const addition of additions){
  const row=get(addition.id);assert.equal(row.published,true,addition.id);
  assert.equal(row.inventoryAvailability,'unconfirmed');
  if(addition.officialProduct){
   assert.equal(row.productStage,'released');assert.equal(row.verified,true);
   assert.ok(row.references.some(ref=>ref.scope==='model'&&ref.url===addition.officialProduct.source));
   assert.notEqual(new URL(addition.officialProduct.source).pathname,'/','homepage is not model evidence');
  }else assert.equal(row.verified,false,'inventory dimensions are not manufacturer evidence');
 }
 assert.ok(!rows.some(row=>row.brand==='Creamsource'&&/\bC3\b/.test(row.name)));
 assert.equal(canonicalEquipmentStats.excludedRows,4);
});

test('key new and existing representative models remain separate',()=>{
 for(const id of ['v51-arri-alexa-265','v51-arri-alexa-35-xtreme','cam-alexa-35','cam-sony-fx5','v51-sony-ilme-fx2','v51-aputure-storm-xt52','v51-aputure-storm-cs32','v51-arri-l7-c-plus','v51-kino-flo-celeb-ikon-12']){
  assert.equal(get(id)?.published,true,id);
 }
 assert.notEqual(get('cam-alexa-35').id,get('v51-arri-alexa-35-xtreme').id);
 assert.ok(!rows.some(row=>/L10-C Plus/.test(row.name)));
 assert.notEqual(get('v51-creamsource-vortex-2').id,get('v51-creamsource-vortex-2-soft').id);
});

test('explicit native mounts override heuristics without inventing configurable mounts',()=>{
 for(const [id,mount] of [['v51-canon-eos-c400','RF'],['v51-panasonic-lumix-gh7','MFT'],['v51-panasonic-lumix-s1ii','L'],['v51-gopro-mission-1-pro-ils','MFT'],['v51-insta360-x6','fixed'],['v51-arri-alexa-35-xtreme','unknown'],['v51-red-v-raptor-xe-8k-vv','unknown']]){
  assert.equal(classifyEquipment(get(id)).lensMount,mount,id);
 }
 assert.ok(classifyEquipment(get('v51-arri-alexa-35-xtreme')).traits.includes('high-speed'));
 assert.ok(classifyEquipment(get('v51-arri-alexa-265')).traits.includes('full-frame'));
});

test('mixed sizes split into selectable items without assigning saved project quantities',()=>{
 for(const [oldId,count] of [['eq-通用-led-air-cushion-lamp-灯光器材',4],['eq-aputure-爱图仕-棒灯-4尺-2尺-灯光器材',2],['eq-aputure-爱图仕600d-600x-灯光器材',2]]){
  const old=get(oldId);assert.equal(old.published,false);assert.equal(old.identityBasis,'superseded-for-selection');
  assert.equal(old.replacementIds.length,count);
  assert.ok(old.replacementIds.every(id=>get(id)?.published));
  const input=[{id:oldId,qty:3,note:'历史库存未分型号'}];
  assert.deepEqual(migrateCatalogKit(input),input);
 }
 const air=get('eq-通用-led-air-cushion-lamp-灯光器材').replacementIds.map(get);
 assert.equal(new Set(air.map(row=>row.name)).size,4);
 assert.ok(air.every(row=>!row.verified&&!/ft|米|英尺/.test(row.name)));
});

test('confirmed duplicate identities merge quantities and notes after category correction',()=>{
 for(const ids of [
  ['eq-dji-dji-master-wheels-摄影机附件','eq-dji-大疆摇轮-移动器材'],
  ['eq-tilta-tilta-armor-man-3-0-摄影机附件','eq-通用-tilta-max-armor-man-3-0-移动器材'],
  ['eq-oconnor-o-connor-2560-fluid-head-摄影机附件','eq-oconnor-o-connor-2560-fluid-head-移动器材']]){
  assert.equal(resolveCatalogId(ids[0]),resolveCatalogId(ids[1]));
  assert.equal(get(ids[0]).category,'移动器材');
  const [merged]=migrateCatalogKit([{id:ids[0],qty:2,note:'A机'},{id:ids[1],qty:3,note:'B机'}]);
  assert.equal(merged.qty,5);assert.match(merged.note,/A机/);assert.match(merged.note,/B机/);
 }
});

test('brand-only evidence and nomenclature corrections preserve verification boundaries',()=>{
 const input={...get('eq-nanlite-南光rgb板灯-灯光器材'),name:'旧名',verified:false,namingStatus:'pending',identityBasis:'specific-inventory'};
 const fixed=applyFinalCatalogReview(input);
 assert.equal(fixed.verified,false);assert.equal(fixed.namingStatus,'pending');
 assert.equal(input.name,'旧名');
 assert.equal(get('eq-dji-ready-rig-摄影机附件').brand,'Ready Rig');
 assert.equal(get('eq-dji-ready-rig-摄影机附件').verified,false);
 assert.ok(!/GS/.test(get('eq-dji-ready-rig-摄影机附件').name));
 for(const row of rows.filter(row=>row.published))assert.doesNotMatch(row.englishName,/\b([A-Za-z]{3,})\s+\1\b/i,row.id);
 for(const retained of finalReview.preservedNicknames){
  const row=get(retained.id);assert.equal(row.published,true);
  assert.ok(row.name===retained.name||row.aliases.includes(retained.name));
 }
});

test('review covers every preexisting camera and lighting brand field with an explicit conclusion',()=>{
 const inventory=read('data/catalog/v4-inventory.json').rows;
 for(const row of inventory.filter(row=>['摄影机','灯光器材'].includes(row.category))){
  const current=get(row.id);
  assert.ok(finalReview.brands.some(review=>review.brand===current.brand&&review.category===current.category&&review.conclusion),`${row.brand} / ${row.category}`);
 }
 for(const review of finalReview.brands){
  assert.ok(review.representativeIds.every(id=>get(id)),review.brand);
  if(review.newIds.length&&review.scope==='manufacturer')assert.ok(review.sources.length,review.brand);
 }
});
