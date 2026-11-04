import fs from 'node:fs';
import {checkedAt} from './catalog-naming.mjs';

// Explicit user-approved exceptions. A retained stock label is not official model evidence.
export const editorialDecisions = JSON.parse(fs.readFileSync(new URL('../data/catalog/editorial-decisions.json',import.meta.url),'utf8')).decisions;
export const latestSeriesChoices = {
 'cam-dji-mavic-unspecified':['v5-dji-mavic-4-pro'],
 'cam-dji-osmo-action-unspecified':['v5-dji-osmo-action-6'],
 'cam-dji-osmo-pocket-unspecified':['v5-dji-osmo-pocket-4p'],
 'grip-dji-rs-unspecified':['v5-dji-rs-5'],
 'eq-laowa-laowa-镜头':['v5-laowa-probe-zoom-15-24','v5-laowa-probe-zoom-15-35'],
};
const restoredLabels = {
 'eq-arri-arri-mp-镜头':{series:'Master Prime',model:'基本组',unit:'组'},
 'eq-arri-arri-sp-镜头':{series:'Signature Prime',model:'基本组',unit:'组'},
 'eq-arri-arri-up-镜头':{series:'Ultra Prime',model:'基本组',unit:'组'},
 'eq-sony-sony-135-镜头':{model:'135mm F1.8'},
 'eq-sony-sony-2-镜头':{model:'2× 增倍镜'},
 'eq-lensbaby-lensbaby-镜头':{model:''},
 'eq-dji-dji-osmo-摄影机附件':{series:'',model:'OSMO 手持云台'},
 'eq-通用-360head-360-摄影机附件':{model:'360Head 360 云台'},
 'eq-通用-mini-lf-codex-摄影机附件':{model:'Mini LF CODEX 读卡器'},
 'eq-codex-codex-摄影机附件':{model:'读卡器'},
 'eq-eartec-eartec-摄影机附件':{model:'三方通话'},
 'eq-sounddevices-sounddevices-摄影机附件':{model:'录音机'},
 'eq-steadibag-steadibag-摄影机附件':{model:'马鞍袋'},
 'eq-teris-teris-摄影机附件':{model:'图瑞斯 弹弓'},
 'eq-tvlogic-tvlogic-监看':{model:'大监视器'},
 'eq-nikon-steadicam-移动器材':{model:'斯坦尼康'},
 'eq-nanlite-led-rgb-1-灯光器材':{model:'RGB 1尺灯管'},
 'eq-nanlite-led-rgb-2-灯光器材':{model:'RGB 2尺灯管'},
 'eq-nanlite-led-rgb-4-灯光器材':{model:'RGB 4尺灯管'},
 'eq-nanlite-wifi-灯光器材':{model:'WIFI 控制盒'},
 'eq-通用-led-lite-灯光器材':{model:'LED LITE 利帅 S30-C 荧光板'},
 'eq-通用-moon-light-灯光器材':{model:'Moon Light 月亮灯架套件'},
 'eq-通用-studio-fold-297bbase-灯光器材':{model:'Studio Fold #297BBASE 地龟灯架'},
};
const splitChoices = {
 'eq-aputure-aputure-led-灯光器材':['v5-aputure-b7c-8-kit','v5-aputure-mc-12-kit'],
 'eq-tiffen-tiffen-摄影机附件':Array.from({length:10},(_,i)=>`v5-tiffen-label-${i+1}`),
 'eq-movmax-movmax-移动器材':['v5-movmax-slider-label','v5-movmax-suction-label'],
};

export function prepareEditorialRow(input) {
 let row={...input};
 const changes=restoredLabels[row.id];
 if(changes) {
  row={...row,...changes};
  if(/^eq-arri-arri-(mp|sp|up)-/.test(row.id)) {
   row.namingStatus='official-series';row.verified=false;
   row.reviewNotes=['常用简称已补全官方系列名称；基本组沿用库存组合，焦段清单冲突不推测补全'];
  }
 }
 if(row.officialProduct) {
  const evidence=row.officialProduct;
  row={...row,brandZh:evidence.brandZh??row.brandZh,brandEn:evidence.brandEn??row.brandEn,series:evidence.series??'',model:evidence.model,namingStatus:'official-model',verified:true,reviewNotes:[]};
  row.references=[...row.references,{url:evidence.source,scope:'model',language:evidence.language??'en',checkedAt:evidence.checkedAt??checkedAt}];
  delete row.officialProduct;
 }
 // Foreign-product aliases are restored as separate selectable identities.
 if(row.id==='eq-arri-arri-mp-镜头')row.aliases=row.aliases.filter(a=>!a.includes('百微'));
 if(row.id==='grip-howmoco')row.aliases=row.aliases.filter(a=>!/^FILMOTECHNIC|^MOVIE BIRD/.test(a));
 if(latestSeriesChoices[row.id]||splitChoices[row.id]) {
  row.replacementIds=latestSeriesChoices[row.id]??splitChoices[row.id];
  row.catalogDecision=latestSeriesChoices[row.id]?'latest-series-choice':'split-inventory-labels';
 }
 if(changes||input.officialProduct) {
  row.aliases=[...new Set([...row.aliases,input.name])];
  row.name=[row.brandZh,row.brandEn,row.series,row.model].filter(Boolean).join(' ');
 }
 return row;
}

export function decideEditorialPublication(row,stripReview,rename) {
 const decision=editorialDecisions[row.id];
 if(!decision)return row;
 if(row.replacementIds) {
  row.published=false;row.identityBasis='superseded-for-selection';
  row.releaseReason=row.catalogDecision==='latest-series-choice'
   ?'系列泛称由本次核对的最新型号提供新选材选项；旧记录保留原身份'
   :'原条目混合多个不同器材，已分别恢复选材项；旧记录保留原身份';
 }else if(decision.action==='exclude') {
  row.published=false;row.identityBasis='unusable';row.catalogDecision='exclude-vague-light';
  row.releaseReason='未记录具体型号、尺寸或功率的笼统灯具，按用户确认的发布范围移出';
 }else {
  row=rename(row,{model:stripReview(row.model)});
  row.published=true;row.catalogDecision='retain-user-approved-label';
  row.identityBasis=row.namingStatus==='official-series'?'official-series':row.brand==='通用'?'generic-function':'user-retained-name';
  row.releaseReason='按用户确认保留品牌泛称、特殊器材原名或辅助功能名称；缺失型号不编造';
  if(row.namingStatus!=='official-model')row.verified=false;
 }
 return row;
}
