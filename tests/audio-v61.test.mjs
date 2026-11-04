import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {canonicalEquipment,publishedEquipment} from '../app/equipment-catalog.canonical.ts';
import {equipmentCardData} from '../app/equipment-card-data.generated.ts';
import {filterCatalog,copyHistoricalKit} from '../app/direct-selection.ts';
import {migrateCatalogKit} from '../app/catalog-identity.ts';
const review=JSON.parse(fs.readFileSync(new URL('../data/catalog/audio-v6.1-review.json',import.meta.url)));
const map=new Map(canonicalEquipment.map(row=>[row.id,row]));

test('audio additions have item-level factory evidence and do not claim supplier inventory',()=>{
 assert.equal(review.newIds.length,27);
 const brands=new Map();
 for(const id of review.newIds){
  const row=map.get(id);assert.ok(row,id);assert.equal(row.category,'录音器材');
  assert.equal(row.published,true);assert.equal(row.verified,true);assert.equal(row.inventoryAvailability,'unconfirmed');
  assert.equal(row.productStage,'released');assert.equal(row.reviewedAt,'2026-11-04');
  assert.ok(row.references.some(ref=>ref.scope==='model'&&ref.checkedAt==='2026-11-04'&&new URL(ref.url).pathname!=='/'));
  assert.equal(equipmentCardData[id].technicalSpecs.length,3);
  brands.set(row.brand,(brands.get(row.brand)??0)+1);
 }
 assert.deepEqual(Object.fromEntries(brands),{'RØDE':7,DJI:8,SONY:6,Sennheiser:6});
});

test('wireless kit identities distinguish generations, actual transmitters, and receiver variants',()=>{
 const id=suffix=>'v61-audio-'+suffix;
 for(const model of ['dji-mic3','dji-mic-mini2s']){
  const component=id(model+'-transmitter');const kit=id(model+'-2tx-kit');
  assert.notEqual(map.get(component).name,map.get(kit).name);
  assert.equal(map.get(component).unit,'个');assert.equal(map.get(kit).unit,'套');
  assert.equal(review.packages[component].rx,0);assert.equal(review.packages[kit].tx,2);
 }
 assert.notEqual(map.get(id('dji-mic2-2tx-kit')).id,map.get(id('dji-mic3-2tx-kit')).id);
 const standard=review.packages[id('dji-mic-mini2-2tx-kit')];const mobile=review.packages[id('dji-mic-mini2-mobile-2tx-kit')];
 assert.equal(standard.receiverType,'standard');assert.equal(mobile.receiverType,'mobile');
 const usb=review.packages[id('rode-wireless-micro-usb-c')];const lightning=review.packages[id('rode-wireless-micro-lightning')];const camera=review.packages[id('rode-wireless-micro-camera-kit')];
 assert.equal(usb.connector,'USB-C');assert.equal(lightning.connector,'Lightning');assert.equal(camera.rx,2);
 assert.equal(review.packages[id('sennheiser-profile-wireless-1ch')].tx,1);
 assert.equal(review.packages[id('sennheiser-profile-wireless-1ch')].receiverChannels,2);
 assert.equal(review.packages[id('sennheiser-ewdp-eng-s4-7')].tx,2);
 assert.equal(review.packages[id('sennheiser-ewdp-eng-s4-7')].receiverChannels,1);
});

test('search supports RODE spelling and Chinese brands without silently identifying old unknown kits',()=>{
 for(const [query,brand] of [['RODE Wireless','RØDE'],['森海塞尔 Profile','Sennheiser'],['索尼 ECM-W3','SONY'],['大疆麦克风三代','DJI']]){
  const matches=filterCatalog(publishedEquipment,{category:'录音器材',brand:'全部',query,namingFilter:'全部'});
  assert.ok(matches.length,query);assert.ok(matches.some(row=>row.brand===brand),query);
 }
 for(const oldId of ['audio-dji-mic-unspecified','eq-sony-索尼无线麦-录音器材','eq-sony-索尼小蜜蜂-录音器材','eq-sony-sony-uwp-d11-监看','eq-通用-森海塞尔-416话筒-挑杆-录音器材'])assert.ok(map.has(oldId),oldId);
 const rows=[{id:'audio-dji-mic-unspecified',qty:4,note:'历史项目未注明代际'},{id:'v61-audio-dji-mic3-2tx-kit',qty:2,note:'两套双发套装'},{id:'v61-audio-dji-mic3-transmitter',qty:3,note:'三只单发'}];
 assert.deepEqual(migrateCatalogKit(rows),rows);
 const copied=copyHistoricalKit({id:'audio',label:'录音项目',items:rows.map(row=>row.id),quantities:Object.fromEntries(rows.map(row=>[row.id,row.qty]))},map);
 assert.deepEqual(copied.map(row=>[row.id,row.qty]),rows.map(row=>[row.id,row.qty]));
});

test('conditional technical specifications preserve firmware and regional frequency boundaries',()=>{
 for(const channels of [1,2])assert.match(equipmentCardData[`v61-audio-sennheiser-profile-wireless-${channels}ch`].technicalSpecs.find(spec=>spec.label==='内录').value,/v4\.1\.0/);
 for(const kit of ['me2','eng'])assert.equal(equipmentCardData[`v61-audio-sennheiser-ewdp-${kit}-s4-7`].technicalSpecs.find(spec=>spec.label==='频段').value,'S4-7：630–662 MHz');
 assert.match(equipmentCardData['v61-audio-sony-uwp-d21'].technicalSpecs.find(spec=>spec.label==='无线系统').value,/地区频段按实物/);
});
