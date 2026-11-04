import fs from 'node:fs';
import {checkedAt} from './catalog-naming.mjs';

export const finalReview=JSON.parse(fs.readFileSync(new URL('../data/catalog/review.v5.1.json',import.meta.url),'utf8'));
const patches=new Map(finalReview.patches.map(patch=>[patch.id,patch]));
if(patches.size!==finalReview.patches.length)throw new Error('Duplicate final review patch ID');

export function applyFinalCatalogReview(input) {
 const patch=patches.get(input.id);
 if(!patch)return input;
 let row={...input,...patch.set};
 const previousName=input.name;
 row.name=[row.brandZh,row.brandEn,row.series,row.model].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
 row.aliases=[...new Set([...input.aliases.filter(a=>!(patch.removeAliases??[]).includes(a)),...(patch.addAliases??[]),...(row.name!==previousName?[previousName]:[])])].filter(a=>a!==row.name);
 if(patch.evidence) {
  const {url,scope='model',language='en',checkedAt:evidenceDate=checkedAt}=patch.evidence;
  row.references=[...row.references,{url,scope,language,checkedAt:evidenceDate}];
  if(scope==='model'||scope==='series') {
   row.namingStatus=scope==='model'?'official-model':'official-series';
   row.verified=scope==='model';
   row.identityBasis=row.namingStatus;
   row.reviewNotes=scope==='model'?[]:['官方系列已确认，未记录的库存配置不补造'];
  }
 }
 if(patch.englishName)row.englishName=patch.englishName;
 if(patch.set?.brand&&patch.set.brand!==input.brand&&!['model','series'].includes(patch.evidence?.scope)) {
  row.namingStatus='pending';row.verified=false;
  row.identityBasis='specific-inventory';
 }
 // Editorial replacement choices must never change the identity of a saved project.
 if(patch.set?.replacementIds) {
  row.published=false;row.identityBasis='superseded-for-selection';
  row.catalogDecision='split-inventory-labels';
  row.releaseReason='混合库存描述已分列为独立选材项；旧项目保留原记录';
 }
 row.finalReviewChanges=[{previousName,name:row.name,previousEnglishName:input.englishName,englishName:row.englishName,reason:patch.reason,source:patch.evidence?.url}];
 return row;
}
