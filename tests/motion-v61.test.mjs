import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { canonicalEquipment, publishedEquipment } from '../app/equipment-catalog.canonical.ts';
import { equipmentCardData } from '../app/equipment-card-data.generated.ts';
import { filterCatalog } from '../app/direct-selection.ts';
const review=JSON.parse(fs.readFileSync(new URL('../data/catalog/motion-v6.1-review.json',import.meta.url)));

test('new grip models are selectable with dated model evidence and unconfirmed rental inventory',()=>{
 for(const id of review.newIds){
  const row=publishedEquipment.find(row=>row.id===id);
  assert.ok(row,id);assert.equal(row.category,'移动器材');assert.equal(row.verified,true);
  assert.equal(row.inventoryAvailability,'unconfirmed');
  assert.ok(row.references.some(ref=>ref.scope==='model'&&ref.checkedAt==='2026-11-04'));
  assert.ok(equipmentCardData[id]);
 }
});
test('Scorpio 23 and 23L, and GFM GF-8 and Xten keep distinct historical identities',()=>{
 const rows=new Map(canonicalEquipment.map(row=>[row.id,row]));
 assert.ok(rows.has('eq-scorpio-super-scorpio-crane-23-移动器材'));
 assert.ok(rows.has('v61-scorpio-23l'));
 assert.notEqual(rows.get('v61-scorpio-23l').name,rows.get('eq-scorpio-super-scorpio-crane-23-移动器材').name);
 assert.ok(rows.has('eq-gfm-grip-factory-gf-8-xten-crane-移动器材'));
 assert.equal(rows.get('v61-gfm-gf-8').subcategory,'模块化摇臂');
 assert.equal(rows.get('v61-gfm-gf-9').subcategory,'模块化摇臂');
 const result=filterCatalog(publishedEquipment,{category:'移动器材',brand:'全部',query:'天蝎38尺',namingFilter:'全部'});
 assert.ok(result.some(row=>row.id==='v61-scorpio-38'));
 const teris=filterCatalog(publishedEquipment,{category:'移动器材',brand:'TERIS',query:'图瑞斯',namingFilter:'全部'});
 assert.ok(teris.some(row=>row.id==='v61-teris-ts350cf'));
});
test('Sachtler head variants retain mounting and kit boundaries',()=>{
 const models=['video-18-s2','video-20-s1','aktiv8','aktiv10'].map(slug=>publishedEquipment.find(row=>row.id==='v61-sachtler-'+slug));
 assert.equal(new Set(models.map(row=>row.id)).size,4);
 for(const row of models){assert.equal(row.unit,'台');assert.equal(row.subcategory,'液压云台');}
 assert.equal(equipmentCardData['v61-sachtler-aktiv8'].technicalSpecs.find(spec=>spec.label==='球碗直径').value,'75 mm');
 assert.equal(equipmentCardData['v61-sachtler-aktiv10'].technicalSpecs.find(spec=>spec.label==='球碗直径').value,'100 mm');
});

test('extended domestic support catalogue separates factory models from unverified local names',()=>{
 assert.equal(review.extensionIds.length,24);
 const pending=new Set(review.pendingIds);
 for(const id of review.extensionIds){
  const row=publishedEquipment.find(row=>row.id===id);
  assert.ok(row,id);assert.equal(row.inventoryAvailability,'unconfirmed');
  assert.equal(row.verified,!pending.has(id),id);
  assert.ok(row.references.some(ref=>ref.checkedAt==='2026-11-04'),id);
  if(pending.has(id)){
   assert.equal(row.namingStatus,'pending');
   assert.ok(row.references.some(ref=>['institution','supplier'].includes(ref.scope)));
   assert.equal(equipmentCardData[id].technicalSpecs.length,0,'no foreign model specifications may be assigned to local labels');
  }else{
   assert.ok(row.references.some(ref=>ref.scope==='model'));
   assert.equal(equipmentCardData[id].technicalSpecs.length,3);
  }
 }
});

test('N6 and V12 searches expose exact historical local labels without collapsing PLUS or overseas kits',()=>{
 for(const [query,id] of [['图瑞斯 N6','v61-teris-ts-n6'],['图瑞斯 V12','v61-teris-tx-v12']]){
  const matches=filterCatalog(publishedEquipment,{category:'移动器材',brand:'TERIS',query,namingFilter:'全部'});
  assert.ok(matches.some(row=>row.id===id));
 }
 const variants=['v61-teris-ts-n6','v61-teris-ts-n6-plus','v61-teris-ts-n6al-plus','v61-teris-ts-n6cf-plus','v61-teris-ts-n6cf-q-plus','v61-teris-tx-v12','v61-teris-tx-v12-plus','v61-teris-ts100','v61-teris-ts100al','v61-teris-ts100cf','v61-teris-ts100cf-q'];
 const rows=variants.map(id=>canonicalEquipment.find(row=>row.id===id));
 assert.ok(rows.every(Boolean));assert.equal(new Set(rows.map(row=>row.name)).size,variants.length);
 const head=rows.find(row=>row.id==='v61-teris-ts100');const kit=rows.find(row=>row.id==='v61-teris-ts100cf');
 assert.equal(head.unit,'台');assert.equal(kit.unit,'套');
 assert.equal(equipmentCardData['v61-teris-ts100cf'].technicalSpecs.find(spec=>spec.label==='脚管材质').value,'碳纤维');
 assert.equal(equipmentCardData['v61-teris-ts100al'].technicalSpecs.find(spec=>spec.label==='脚管材质').value,'铝合金');
});

test('separate tripod and head identities retain independent quantities in restored historical kits',async()=>{
 const {copyHistoricalKit}=await import('../app/direct-selection.ts');
 const map=new Map(canonicalEquipment.map(row=>[row.id,row]));
 const ids=['v61-teris-ts-n6','v61-teris-ts-n6-plus','v61-teris-tx-v12','v61-teris-ts100cf','v61-sachtler-flowtech100-ms'];
 const quantities=Object.fromEntries(ids.map((id,index)=>[id,index+2]));
 const copied=copyHistoricalKit({id:'test',label:'型号核对',items:ids,quantities},map);
 assert.deepEqual(copied.map(row=>[row.id,row.qty]),ids.map(id=>[id,quantities[id]]));
 assert.ok(copied.every(row=>row.status==='pending'));
});
