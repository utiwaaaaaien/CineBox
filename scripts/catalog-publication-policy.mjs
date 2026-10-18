// V5 clarification: correct known product specifications; exclude unusably vague names.
// Publication eligibility and manufacturer verification are separate facts.
import {families, cleanText, checkedAt} from './catalog-naming.mjs';
import {prepareEditorialRow,decideEditorialPublication} from './catalog-editorial-review.mjs';

const englishSeries={'雅典娜':'ATHENA','瞬':'Simera-C','玄蜂':'VESPID PRIME','观':'GNOSIS MACRO','繁花':'Floral','光风暴':'Light Storm','暴风':'STORM'};
const translations=[
 ['万花筒滤镜','Kaleidoscope Filter'],['炫光孔雀镜','Peacock Flare Filter'],['白拉丝','White Streak Filter'],['橙色镜','Orange Filter'],['稻草','Straw Filter'],['放大镜','Magnifier'],['蓝渐变','Blue Graduated Filter'],['山羊皮','Chamois'],['珊瑚镜','Coral Filter'],['数码柔','Digital Diffusion Filter'],['星光镜','Star Filter'],['烟草','Tobacco Filter'],
 ['无线手持麦','Wireless Handheld Microphone'],['无线麦克风','Wireless Microphone'],['无线麦','Wireless Microphone'],['小蜜蜂','Lavalier Microphone'],['运动相机','Action Camera'],['全景相机','Panoramic Camera'],['章鱼时码器','Octopus Timecode Generator'],['采集卡','Capture Card'],['对讲机','Intercom'],['小米','Xiaomi'],['三方通话系统','Intercom System'],['三方通话','Intercom'],['变焦伺服','Zoom Servo'],['增倍镜','Teleconverter'],['手持云台','Handheld Gimbal'],['马鞍袋','Saddle Bag'],['控制盒','Control Box'],['灯管','Tube Light'],['无线监视器','Wireless Monitor'],['无线小监','Wireless Monitor'],['寸','inch'],['碳纤维','Carbon Fiber'],
 ['全画幅定焦组','Full Frame Prime Lens Set'],['镜头基本组','Lens Set'],['定焦组','Prime Lens Set'],['柔化滤镜组','Diffusion Filter Set'],['柔化滤镜','Diffusion Filter'],['滤镜组','Filter Set'],
 ['特调版','Detuned'],['二代','II'],['一代','I'],['微距','Macro'],['鱼眼','Fisheye'],['移轴','Tilt-Shift'],['探针','Probe'],['百微','100mm Macro'],
 ['旋转','Rotating'],['偏振镜','Polarizer'],['灰片','ND Filter'],['黑柔/白柔','Black / White Mist'],['无线跟焦','Wireless Follow Focus'],['跟焦','Follow Focus'],['智能电池','Intelligent Battery'],
 ['充电器','Battery Charger'],['电池','Battery'],['摄影机','Camera'],['机身套件','Camera Rig Kit'],['机头灯','On-Camera Light'],['棒灯','Tube Light'],['布灯','Flexible Panel Light'],['灯具','Light'],
 ['监视记录仪','Monitor Recorder'],['监视器','Monitor'],['监视','Monitor'],['小监','Monitor'],['监看','Monitor'],['录音机','Audio Recorder'],['话筒','Microphone'],['挑杆','Boom Pole'],['时码器','Timecode Generator'],
 ['液压云台','Fluid Head'],['遥控云台','Remote Head'],['云台','Head'],['摇臂','Jib'],['伸缩炮','Telescopic Crane'],['滑轨','Slider'],['地轨','Track'],['轨道','Track'],['稳定器','Stabilizer'],
 ['导演椅','Director Chair'],['器材车','Equipment Cart'],['监视器车','Monitor Cart'],['长臂','Long Arm'],['短臂','Short Arm'],['套件','Kit'],['基本组','Set'],['潜水壳','Underwater Housing'],['目镜','Viewfinder'],
 ['无线图传','Wireless Video Transmission'],['图传','Video Transmission'],['读卡器','Media Reader'],['减震臂','Vibration Isolator Arm'],['空气','Air'],['电动','Motorized'],['小','Small'],['大','Large'],
 ['轻型','Lightweight'],['重型','Heavy-duty'],['直轨','Straight Track'],['弯轨','Curved Track'],['脚架','Tripod'],['低脚架','Hi-Hat'],['撑杆','Spreader'],['灯架','Light Stand'],['多孔板','Cheese Plate'],
 ['摄影翘板','Camera Wedge Plate'],['翘板','Wedge Plate'],['调平头','Leveling Head'],['吸盘','Suction Cup'],['分接线','Splitter Cable'],['管制框耳','Pipe Frame Ear'],['遮光斗','Matte Box'],['雨刷装置','Rain Deflector'],
 ['安全绑带','Safety Belt'],['束光筒','Projection Attachment'],['软蜂巢','Soft Eggcrate'],['黑布','Solid Black'],['数码绿幕','Digital Green Screen'],['四分之一格栅柔光布','Quarter Grid Cloth'],['半格栅柔光布','Half Grid Cloth'],['全格栅柔光布','Full Grid Cloth'],
 ['原色/漂白棉布','Unbleached / Bleached Muslin'],['丝绸柔光布','Silk'],['单层减光纱','Single Scrim'],['双层减光纱','Double Scrim'],['减光纱','Scrim'],['镜面反光板','Mirror Reflector'],['钢镜反光板','Steel Mirror Reflector'],
 ['框架','Frame'],['铝管','Aluminum Pipe'],['转接头','Adapter'],['钢制灯架','Steel Stand'],['增高柱','Riser'],['米切尔板','Mitchell Plate'],['重型悬挂夹','Heavy-duty Hanging Clamp'],['色纸框耳延长杆','Gel Frame Ear Extensions'],
 ['夹头','Grip Head'],['钉板','Nail-on Plate'],['接口','Mount'],['摄影头盔','Camera Helmet'],['半','Half'],['组合','Set'],['组','Set'],['尺','ft'],['英寸','inch'],['颗',''],['支',''],['台',''],['E口','E Mount'],['LPL口','LPL Mount'],['PL口','PL Mount'],['RF口','RF Mount'],
];
const categoryEnglish={'摄影机':'Camera','镜头':'Lens','滤镜':'Filter','摄影机附件':'Camera Accessory','监看':'Monitor','移动器材':'Camera Support','灯光器材':'Lighting Equipment','录音器材':'Audio Equipment','其他':'Equipment'};
const stripReview=text=>cleanText(text).replace(/[（(](改口)配置待(?:确认|核验)[）)]/g,'($1)').replace(/[（(](?:型号|品牌型号|品牌|系列|配置|版本|规格|代际)待(?:确认|核验)[）)]/g,'').trim();
const buildName=row=>[row.brandZh,row.brandEn,row.series,row.model].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
function rename(row,changes,source) {
 const original=row.name;
 row={...row,...changes};row.name=buildName(row);
 row.aliases=[...new Set([...row.aliases,original])].filter(x=>x!==row.name);
 if(source){row.namingStatus='official-model';row.verified=true;row.references=[...row.references,{url:source,scope:'model',language:/\.cn/.test(source)?'zh-CN':'en',checkedAt}];row.reviewNotes=[];}
 return row;
}
function correct(row,changes,source) {
 const previous=row.name;
 row=rename(row,changes,source);
 if(previous!==row.name)row.reviewCorrections=[...(row.reviewCorrections??[]),{originalName:previous,name:row.name,source,reason:'产品身份可明确对应，按厂商官方规格纠正'}];
 return row;
}

export function amendPublication(input,lensRules,exactModels) {
 let row=prepareEditorialRow(input);
 if(row.id==='eq-通用-dana-dolly-移动器材'){
  row=rename(row,{series:'',model:'铝管滑轨'},'https://danadolly.com/product/dana-dolly/');
  row.references=row.references.map(ref=>ref.url==='https://danadolly.com/product/dana-dolly/'?{...ref,scope:'series'}:ref);
  row.namingStatus='official-series';row.verified=false;row.reviewNotes=['厂商产品页可确认 Dana Dolly 滑轨身份，库存未记录套餐和球碗转接配置，不补造'];
 }
 if(row.category==='滤镜'){
  const body=[row.series,row.model].filter(Boolean).join(' ');
  const tiffen='https://tiffen.com/pages/diffusion-guide', schneider='https://schneiderkreuznach.com/en/cine-optics/filters/cine-filters/diffusion-and-mist';
  const filterFamilies=[
   [/black\s*pro[- ]?mist/i,'Tiffen','Black Pro-Mist',tiffen],[/\bpro[- ]?mist/i,'Tiffen','Pro-Mist',tiffen],
   [/black glimmer(?:glass)?/i,'Tiffen','Black Glimmerglass',tiffen],[/glimmer\s*glass/i,'Tiffen','Glimmerglass',tiffen],
   [/pearlescent/i,'Tiffen','Pearlescent',tiffen],[/black diffusion(?:\s*fx)?/i,'Tiffen','Black Diffusion/FX',tiffen],
   [/digital diffusion(?:\s*fx)?/i,'Tiffen','Digital Diffusion/FX',tiffen],[/black satin/i,'Tiffen','Black Satin',tiffen],
   [/soft[- /]?fx/i,'Tiffen','Soft/FX',tiffen],[/low contrast/i,'Tiffen','Low Contrast',tiffen],[/ultra contrast/i,'Tiffen','Ultra Contrast',tiffen],
   [/hollywood black magic|HLYWD BLK Magic/i,'Schneider','Hollywood Black Magic',schneider],[/classic soft/i,'Schneider','Classic Soft',schneider],[/black frost/i,'Schneider','Black Frost',schneider],
  ];
  const matched=filterFamilies.find(([pattern])=>pattern.test(body));
  if(matched){
   const [pattern,brand,series,source]=matched;
   const model=body.replace(pattern,' ').replace(/\bfilters?\b/gi,'').replace(/4\s*[x×]\s*5\.6(?!\d)/gi,'4×5.65').replace(/\s+/g,' ').trim();
   row=correct(row,{brand,brandZh:'',brandEn:brand==='Schneider'?'Schneider-Kreuznach':brand,series,model},source);
   row.references=row.references.map(ref=>ref.url===source&&ref.scope==='model'?{...ref,scope:'series'}:ref);
   row.namingStatus='official-series';row.verified=false;row.reviewNotes=['滤镜系列和品牌有厂商依据；库存标示强度和套组组合保留，不推测未记录的配置'];
  }
 }
 if(row.category==='镜头'){
  const body=cleanText([row.series,row.model].filter(Boolean).join(' '));
  // Fixed series + focal length identifies the product. Aperture/squeeze typos are corrected.
  const release=lensRules.find(rule=>rule.brand===row.brand&&rule.pattern.test(body));
  const base=families.find(f=>f.category==='镜头'&&f.brand===row.brand&&f.series===row.series&&Object.keys(f.specs).length);
  const rule=release??base;
  if(rule){
   let model=release?body.replace(release.pattern,''):row.model;
   model=cleanText(model).replace(/\s+HAWK$/i,'').replace(/\b(?:Prime|Lenses|Lens|Zoom|Anamorphic)\b/gi,'').trim()
    .replace(/^(\d+(?:\.\d+)?-\d+(?:\.\d+)?)\s*\/\s*T/i,'$1mm T').replace(/(\d+)macro/gi,'$1mm Macro');
   const core=model.match(/^(?:(\d+(?:\.\d+)?)\s*[x×]\s*)?(?:Macro\s+)?(\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?)mm(?:\s+Macro)?(?:\s+(T\d+(?:\.\d+)?))?(?:\s+Macro)?(?:\s+(PL|LPL|EF|E|RF)(?:口| Mount)?)?$/i);
   if(core){
    const [,squeeze,focal,aperture,mount]=core, expected=rule.specs[focal], macro=/macro/i.test(model);
    if(expected&&(!macro||!release||release.macro?.includes(Number(focal)))){
     const corrected=[(squeeze&&rule.squeeze)?`${rule.squeeze}×`:'',`${focal}mm`,macro?'Macro':'',expected,mount?`${mount.toUpperCase()}口`:''].filter(Boolean).join(' ').replace('× ','×');
     row=correct(row,{series:rule.series,model:corrected},rule.source);
     // Preserve unsupported/modified mount identity without claiming factory configuration.
     if(mount){row.namingStatus='official-series';row.verified=false;row.reviewNotes=['系列、焦段及光圈已有厂商依据；卡口沿用具体库存记录，不推测改装配置'];}
     if(aperture===expected&&(!squeeze||squeeze===rule.squeeze))row.reviewCorrections=row.reviewCorrections?.filter(c=>c.originalName!==input.name);
    }
   }
  }
  // Complete Canon/Sony model codes can be compared independently of their aperture token.
  const apertureKey=text=>cleanText(text).replace(/\b[TF]\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?/gi,'').replace(/\s/g,'').toLowerCase();
  const candidates=exactModels.filter(r=>(r.matchBrand??r.brand)===row.brand&&r.category==='镜头'&&apertureKey(r.input)===apertureKey(body));
  if(/\b[TF]\d/.test(body)&&candidates.length===1&&candidates[0].input!==body){const exact=candidates[0];row=correct(row,{series:exact.series??'',model:exact.model},exact.source);}
 }
 // A set with a named optical series is useful even when rental kit composition is unspecified.
 if(row.namingStatus==='official-series'&&row.category==='镜头'&&/(?:组|set)/i.test(row.model))row=rename(row,{model:stripReview(row.model)});

 const model=stripReview(row.model), body=stripReview([row.series,model].filter(Boolean).join(' '));
 const vague=/型号待|品牌待|待核验|待确认|某品牌|某型号|不详|未知|未指定/.test(body)
  || /^(?:录音机|镜头|摄影机|监视器|小监视器|大监视器|小监|大监|无线跟焦|无线图传|时码器|运动相机|360 全景相机|LED 布灯|RGB 棒灯|双色温 LED 机头灯|Mavic 御系列无人机|Osmo Action|Osmo Pocket|Lensbaby|附件|器材|配件|UP|MP|SP|EVF|LCD|RED Touch|Wireless video|Waveform Monitor|Interphone|Camera kit 机身套件)$/i.test(body)
  || (/^\d+(?:\.\d+)?$/.test(body)&&(row.category==='镜头'||row.brand==='通用'||body.length<3));
 const concrete=/\d\s*(?:mm|cm|m\b|ft\b|尺|英寸|[′'″"]|KW|K\b|A\b|T\d|F\d)|\b[A-Z]{1,8}[-_]?[A-Z]*\d|\b(?:Black Pro-Mist|Pro-Mist|Glimmerglass|Pearlescent|Black Satin|Soft FX|IRND|ND|CPL|POL|Polarizar|Close up|Follow Focus|Matte Box|Rain Deflector|Fluid Head|Slider|Track|Dolly|Clamp|Stand|Plate|Adapter|Riser|Spreader|Receiver|Bracket|Scrim|Muslin|Cloth|Silk|Flag|Frame|Eggcrate|Reflector|Cable|Pigtail|Dimmer|Generator|Chair|Cart|Viewfinder|Helmet|Suction|Boom|Head|Grip|Bangi|Tripod)\b|微距|鱼眼|移轴|跟焦|遮光斗|雨刷|肩架|脚架|苹果箱|沙袋|胶带|支架|灯架|框架|夹头|分接线|遮光旗|轨道|撑杆|铝管|转接头|柔光布|数码绿幕|减光纱|反光板|导演椅|器材车|头盔|翘板/i.test(body);
 const usefulSeries=!!row.series&&row.namingStatus==='official-series'&&(!!model||row.unit==='组');
 const dimensions=/\d+(?:\.\d+)?\s*[x×*]\s*\d|\d+\s*(?:W|GB|TB)\b/i.test(body);
 const functional=/follow focus|extender|viewfinder|rain deflector|matte box|soft fx|black diffusion|black frost|clear|satin|fog|grad|streak|diffusion|filter|fresnel|par\b|scrim|tungsten|leveler|leveling|track|slider|tripod|hat\b|rig\b|suction|cart\b|trolley|摇臂|滑轨|地轨|减震|导演椅|平衡车|读卡器|机头麦|话筒/i.test(body);
 const namedProduct=row.brand!=='通用'&&(/[A-Za-z]{3}/.test(body)||/\d+[A-Za-z]|[A-Za-z]+\d/.test(body)||/^\d{3,}$/.test(body))&&!/^LED(?:\s+RGB)?\s*\d*$|^WIFI$|^OSMO$/i.test(body);
 const lensDescription=row.category==='镜头'&&((row.unit==='组'||/基本组/.test(body))&&/\d|定焦组|微距|变形/.test(body)||/^\d+(?:\.\d+)?-\d+(?:\.\d+)?$/.test(body)||/百微|黑魔法柔/.test(body));
 const accessoryDescription=/电池|增倍镜|黑柔|白柔|黑魔法柔|分裂镜|摄影车|移动车|脚组合|机头麦|小摇臂|三轴电动轨|吸盘|直轨|弯轨|WALTER KLASSEN Sling Shot|Jimmy Jib|Knob|Wheels|Pin\b|Header|Arm\b|Cucoloris|Mathflector|Umbrella Light|Column Lamp|Cushion Lamp|Hanging Cage/i.test(body);
 row.published=(!vague)&&(row.published||row.namingStatus==='official-model'||usefulSeries||concrete||dimensions||functional||namedProduct||lensDescription||accessoryDescription);
 if(row.published){
  row=rename(row,{model});
  if(row.brand==='通用'){
   // A functional accessory is valid without inventing a manufacturer.
   if(row.category==='滤镜'&&/^(?:\d.*)?(?:ND|IRND|CPL|POL|Polarizar|Close up)|\b(?:ND|IRND|CPL|POL|Polarizar|Close up)\b/i.test(body)){row.namingStatus='generic';row.verified=false;}
  }
  row.identityBasis=row.namingStatus==='official-model'?'official-model':row.namingStatus==='official-series'?'official-series':row.namingStatus==='generic'?'generic-function':'specific-inventory';
  row.releaseReason=row.identityBasis==='official-model'?'已按厂商型号和官方规格整理':row.identityBasis==='official-series'?'官方系列可明确识别，保留具体库存配置':row.identityBasis==='generic-function'?'功能及规格足以选材，保留通用器材':'库存含具体型号或可用规格，保留身份；未确认参数不补造';
 }else{row.identityBasis='unusable';row.releaseReason='名称过于模糊，无法确定器材身份或形成可用选材描述';}

 row=decideEditorialPublication(row,stripReview,rename);
 const regional={'CineAltaV':'VENICE','CineAltaV 2':'VENICE 2','CineAltaB':'BURANO'};
 let en=input.name===row.name&&input.englishName&&!/[\u3400-\u9fff]|待确认|待核验/.test(input.englishName)
  ?input.englishName:[row.brandEn,englishSeries[row.series]??regional[row.series]??row.series,regional[row.model]??row.model].filter(Boolean).join(' ');
 // Known aliases already carry model spelling; translations below are functional names only.
 for(const [zh,eng] of [...translations].sort((a,b)=>b[0].length-a[0].length))en=en.split(zh).join(` ${eng} `);
 if(/[\u3400-\u9fff]/.test(en)){
  const core=en.replace(/[\u3400-\u9fff]+/g,' ').replace(/\s+/g,' ').trim();
  en=core?`${core} ${categoryEnglish[row.category]}`:categoryEnglish[row.category];
  row.reviewNotes=[...row.reviewNotes,'英文行采用可识别型号和功能译名；未确认的品牌英文名或昵称不编造译名'];
 }
 row.englishName=en.replace(/\s+/g,' ').trim();row.reviewedAt=checkedAt;
 return row;
}
