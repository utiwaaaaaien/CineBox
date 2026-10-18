// Manufacturer specifications reviewed for V5 publication. A source matches a product,
// not merely a brand; specific inventory configurations retain their review notes.
import { cleanText, checkedAt, families } from './catalog-naming.mjs';
import { amendPublication } from './catalog-publication-policy.mjs';

const stops = (focals, aperture) => Object.fromEntries(focals.map(f => [f, aperture]));
const lens = (brand, pattern, series, source, specs, options = {}) => ({brand,pattern,series,source,specs,...options});
export const releaseLensSources = [
  lens('Cooke', /^S4\/?i(?:\s+Prime)?\b/i, 'S4/i', 'https://cookeoptics.cn/lens/s4-i-prime/', {...stops([12,14,16,18,21,25,27,32,35,40,50,65,75,100,135,150,180],'T2'),300:'T2.8'}),
  lens('Cooke', /^S5\/?i(?:\s+Prime)?\b/i, '5/i', 'https://cookeoptics.com/lens/5-i/', stops([18,25,32,40,50,65,75,100,135],'T1.4')),
  lens('Cooke', /^S7\/?i(?:\s+(?:Prime|Full Frame Plus|FF))?\b/i, 'S7/i FF', 'https://cookeoptics.com/lens/cooke-s7-i-ff/', stops([16,18,21,25,27,32,40,50,65,75,100,135,180],'T2')),
  lens('Cooke', /^S8\/?i(?:\s+FF)?\b/i, 'S8/i FF', 'https://cookeoptics.com/lens/s8-i-ff/', stops([18,21,25,27,32,35,40,50,65,75,100,135],'T1.4')),
  lens('Cooke', /^Panchro\/?i Classic\b/i, 'Panchro/i Classic', 'https://cookeoptics.com/lens/panchro-classic-i-s35/', {...stops([18,21,25,27,32,40,50,75],'T2.2'),65:'T2.4',100:'T2.6',135:'T2.8',152:'T3'}, {macro:[65]}),
  lens('Cooke', /^Anamorphic\/i (?:Full Frame Plus|FF)\b/i, 'Anamorphic/i FF', 'https://cookeoptics.cn/lens/anamorphic-i-ff/', {...stops([32,40,50,75,100,135],'T2.3'),85:'T2.8',180:'T2.9'}, {squeeze:'1.8',macro:[85]}),
  lens('Cooke', /^Anamorphic\/i(?:\s+S35)?(?:\s+Prime)?\b(?!.*\b(?:FF|SF|Full Frame|Scorpio|Zoom)\b)/i, 'Anamorphic/i S35', 'https://cookeoptics.cn/lens/anamorphic-i-s35/', {...stops([25,32,40,50,75,100,135],'T2.3'),65:'T2.6',180:'T2.8',300:'T3.5'}, {squeeze:'2',macro:[65]}),
  lens('Leitz', /^ELSIE\b/i, 'ELSIE', 'https://www.leitz-cine.com/product/elsie', stops([15,18,21,25,29,35,40,50,65,75,100,125,150],'T2.1')),
  lens('Leitz', /^SUMMICRON-C\b/i, 'SUMMICRON-C', 'https://www.leitz-cine.com/product/summicron-c', stops([15,18,21,25,29,35,40,50,75,100,135],'T2')),
  lens('Leitz', /^THALIA(?:\s+65)?\b/i, 'THALIA 65', 'https://www.leitz-cine.com/product/thalia', {20:'T3.6',24:'T3.6',30:'T2.9',35:'T2.6',45:'T2.9',55:'T2.8',70:'T2.6',90:'T2.2',100:'T2.2',120:'T2.6',180:'T3.6'}),
  lens('Leitz', /^(?:LEITZ\s+)?PRIME\b/i, 'PRIME', 'https://www.leitz-cine.com/product/leitz-prime', {...stops([18,21,25,29,35,40,50,65,75,100,135],'T1.8'),180:'T2',350:'T3.6'}),
  lens('ZEISS', /^(?:Compact Prime\s+)?CP\.?3\b/i, 'Compact Prime CP.3', 'https://www.zeiss.com/photonics-and-optics/en/cinematography/lenses/compact-prime-cp-3-lenses.html', {...stops([25,28,35,50,85,100,135],'T2.1'),15:'T2.9',18:'T2.9',21:'T2.9'}),
  lens('ARRI', /^Master Anamorphic(?:\s+MA)?\b/i, 'Master Anamorphic', 'https://www.arri.com/en/company/press/press-releases-2016/arri-zeiss-unveil-two-new-master-anamorphic-lenses', {...stops([28,35,40,50,60,75,100,135],'T1.9'),180:'T2.8'}, {squeeze:'2'}),
  lens('ARRI', /^ALURA(?:\s+(?:LWZ|Studio))?\s+Zoom\b/i, 'Alura Zoom', 'https://www.arri.com/en/cine-lenses/arri-zeiss-fujinon-lenses/legacy/alura-lightweight-zooms', {'15.5-45':'T2.8','30-80':'T2.8','18-80':'T2.6','45-250':'T2.6'}),
  lens('ARRI', /^Master(?:\s+Prime)? Macro\b/i, 'Master Macro', 'https://www.arri.com/en/cine-lenses/arri-zeiss-fujinon-lenses/master-primes/master-macro-100', {100:'T2'}),
  lens('Angénieux', /^Optimo(?:\s+Spherical)?(?:\s+Zoom)?\b(?!.*(?:Style|Ultra|Anamorphic|Prime))/i, 'Optimo', 'https://www.angenieux.com/wp-content/uploads/2016/11/Ang%C3%A9nieux-Catalog-2015.pdf', {'15-40':'T2.6','17-80':'T2.2','19.5-94':'T2.6','24-290':'T2.8','28-76':'T2.6','28-340':'T3.2','45-120':'T2.8'}),
  lens('Angénieux', /^Optimo Anamorphic A2S\b/i, 'Optimo Anamorphic A2S', 'https://www.angenieux.com/wp-content/uploads/2016/06/Plaquette_Angenieux_anamorphique_bd.pdf', {'30-72':'T4','56-152':'T4','44-440':'T4.5'}),
  // The T-stop identifies Sigma cine lenses; still-photo F-stop names use separate model rules.
  lens('SIGMA', /^(?:Cine\s+)?(?:FF High Speed Prime\s*)?(?=\d+mm\s+T)/i, 'FF High Speed Prime', 'https://www.sigma-global.com/en/support/download/FF%20High%20Speed%20Prime%20Line.pdf', {...stops([20,24,28,35,40,50,65,85,105],'T1.5'),14:'T2',135:'T2'}),
];

// Complete inventory model strings accepted only against a named official document.
export const exactModels = [];
export function addModels(brand, category, source, names, options = {}) {
  for(const name of names) exactModels.push({brand,category,source,input:name,model:name,...options});
}
addModels('Canon','摄影机','https://www.canon.com.cn/info/products/2191.html',['EOS C300 Mark II','EOS C300 Mark III','EOS C500 Mark II']);
addModels('Canon','摄影机','https://www.canon.com.cn/info/products/2904.html',['EOS 5D Mark IV']);
addModels('Canon','摄影机','https://www.canon.com.cn/product/eosr5c/',['EOS R5 C']);
addModels('Canon','摄影机','https://www.canon.com.cn/product/r5/index.html',['EOS R5']);
addModels('Canon','摄影机','https://www.canon.com.cn/product/eos/down/brochure/pdf/eos-08p.pdf',['EOS R5 Mark II']);
addModels('SONY','摄影机','https://pro.sony/es_ES/product-resources/brochures/cinema-line-comparison-chart',['ILME-FX3','ILME-FX6','PXW-FX9']);
addModels('SONY','摄影机','https://pro.sony/en_ID/products/handheld-camcorders',['PXW-FS7M2','PXW-Z280']);
addModels('SONY','摄影机','https://www.sonystyle.com.cn/products/ilc.html',['α7 IV','α7S III','α7S II']);
addModels('SONY','摄影机','https://www.sonystyle.com.cn/products/ilc/ilce_7m5/ilce_7m5.html',['α7 V']);
addModels('ARRI','摄影机','https://www.arri.com/en/cine-systems/cine-cameras/amira',['AMIRA']);
addModels('ARRI','摄影机','https://www.arri.com/en/learn/camera-systems/camera-simulators',['ALEXA SXT Plus']);
addModels('ARRI','摄影机','https://www.arri.com/en/learn-help/learn-help-camera-system/config-overview/archive',['ALEXA LF']);
addModels('DJI','移动器材','https://repair.dji.com/help/content?customId=01700011910&lang=en&paperDocType=ARTICLE&re=US&spaceId=17',['Ronin 2','Ronin-S','RS 4 Pro']);
addModels('DJI','摄影机','https://www.dji.com/downloads',['Action 2','Ronin 4D']);
addModels('DJI','摄影机','https://repair.dji.com/help/content?customId=01700043735&lang=en&paperDocType=ARTICLE&re=US&spaceId=17',['Osmo 360 II']);
addModels('SONY','镜头','https://www.sonystyle.com.cn/minisite/di/img/gmaster_10th_anniv/index.html',['FE 14mm F1.8 GM','FE 24mm F1.4 GM','FE 35mm F1.4 GM','FE 50mm F1.2 GM','FE 28-70mm F2 GM','FE 50-150mm F2 GM','FE 16-35mm F2.8 GM II','FE 24-70mm F2.8 GM II','FE 70-200mm F2.8 GM II']);
addModels('SONY','镜头','https://www.sonystyle.com.cn/minisite/di/lenses/dasanyuan/index.htm',['FE 16-35mm F2.8 GM','FE 24-70mm F2.8 GM']);
addModels('SONY','镜头','https://www.sonystyle.com.cn/products/lenses/sel1224gm/sel1224gm_feature.html',['FE 12-24mm F2.8 GM']);
addModels('Canon','镜头','https://www.canon.com.cn/products/bce/download/catalog/download/EF_cinema_lens_online.pdf',['CN-E 14mm T3.1 L F','CN-E 24mm T1.5 L F','CN-E 35mm T1.5 L F','CN-E 50mm T1.3 L F','CN-E 85mm T1.3 L F','CN-E 135mm T2.2 L F']);
addModels('Canon','镜头','https://downloads.canon.com/cinemaeos/CinemaLenses_Brochure_190322.pdf',['CN-E 14mm T3.1 FP X','CN-E 20mm T1.5 FP X','CN-E 24mm T1.5 FP X','CN-E 35mm T1.5 FP X','CN-E 50mm T1.3 FP X','CN-E 85mm T1.3 FP X','CN-E 135mm T2.2 FP X']);
addModels('Canon','镜头','https://www.canon.com.cn/product/ef100f28l/index.html',['EF 100mm F2.8L IS USM']);
addModels('Canon','镜头','https://www.canon.com.cn/product/ef14f28l2/',['EF 14mm F2.8L II USM']);
addModels('ARRI','灯光器材','https://microsites.arri.com/stellar/assets/downloads/Stellar_supported_fixtures_10_2020.pdf',['L5-C','L7-C','L10-C','Orbiter','Skypanel S30-C','Skypanel S60-C','Skypanel S120-C','Skypanel S360-C']);

// Exact aliases establish identity; the final publication policy corrects small specification conflicts.
function alias(brand, category, source, inputs, model, options = {}) {
  for (const input of inputs) exactModels.push({brand,category,source,input,model,...options,matchBrand:brand});
}
addModels('Panasonic','摄影机','https://consumer.panasonic.cn/product/learn-more/cameras-camcorders/2928.html',['LUMIX GH5','LUMIX GH5S','LUMIX S1H']);
addModels('SONY','摄影机','https://www.sony.jp/ichigan/products/ILCE-7M3/spec.html',['α7 III']);
addModels('Insta360','摄影机','https://www.insta360.com/cn/product/insta360-x3',['X3']);
addModels('Freefly','摄影机','https://freeflysystems.com/ember-s5k',['EMBER S5K']);
addModels('Freefly','摄影机','https://freeflysystems.com/wave',['Wave']);
addModels('GoPro','摄影机','https://gopro.com/en/ie/update',['HERO5 Black','HERO6 Black','HERO7 Black','HERO8 Black','HERO9 Black']);
addModels('Phantom','摄影机','https://phantomhighspeed.my.site.com/ComponentDescription?comptId=a0X1N00000Kacr6UAB',['Flex4K']);
addModels('RED','摄影机','https://docs.red.com/955-0159_v7.4/EPIC-W_GEMINI_7_4/en-us/Content/A_TechSpecs/Specs_GEMINI.htm',['EPIC-W 5K S35 GEMINI']);
addModels('RED','摄影机','https://docs.red.com/955-0203/955-0203_V1.7%20Rev-B%20RED%20PS%2C%20V-RAPTOR%20XL%208K%20VV%20Operation%20Guide%20HTML/Content/B_TechSpecs/Specs_V-RAPTOR_XL.htm',['V-RAPTOR XL 8K VV']);
addModels('DJI','摄影机','https://store.dji.com/cn/product/dji-ronin-4d-8k?set_region=CN',['Ronin 4D-8K']);
const roninSource='https://repair.dji.com/help/content?customId=01700007687&lang=zh-CN&paperDocType=ARTICLE&re=CN&spaceId=17';
alias('DJI','移动器材',roninSource,['如影RS2稳定器','Ronin RS2'],'RS 2',{series:'如影',englishSeries:'Ronin'});
alias('DJI','移动器材',roninSource,['如影RS3 PRO稳定器'],'RS 3 Pro',{series:'如影',englishSeries:'Ronin'});
addModels('DJI','监看','https://www.dji.com/transmission',['High-Bright Remote Monitor','Transmission']);
addModels('DJI','摄影机附件','https://www.dji.com/transmission',['Force Pro','Master Wheels']);
alias('OConnor','移动器材','https://www.ocon.com/wp-content/uploads/2015/05/2560_Flyer.pdf',['2560 Fluid Head'],'2560 Fluid Head');
alias('OConnor','移动器材','https://www.ocon.com/wp-content/uploads/2015/05/2560_Flyer.pdf',['2575D 液压云台'],'2575D Fluid Head');
addModels('OConnor','摄影机附件','https://www.ocon.com/wp-content/uploads/2015/05/2560_Flyer.pdf',['120EX','2560 Fluid Head']);
alias('通用','移动器材','https://www.ocon.com/wp-content/uploads/2015/05/2560_Flyer.pdf',['2575D'],'2575D Fluid Head',{brand:'OConnor',brandZh:'',brandEn:'OConnor'});
alias('通用','录音器材','https://zoomcorp.com/en/ca/handheld-recorders/handheld-recorders/h6-audio-recorder/h6-support/',['H6录音机'],'H6',{brand:'ZOOM',brandZh:'',brandEn:'ZOOM'});
alias('通用','录音器材','https://zoomcorp.com/ja/jp/field-recorders/field-recorders/f8/f8-support/',['F8录音机'],'F8',{brand:'ZOOM',brandZh:'',brandEn:'ZOOM'});
alias('通用','录音器材','https://proav.roland.com/global/support/by_product/r-44/',['罗兰R44录音机'],'R-44',{brand:'Roland',brandZh:'罗兰',brandEn:'Roland'});
// A 416 + boom bundle keeps its inventory configuration without claiming a factory microphone suffix.
alias('通用','录音器材','https://edge.rode.com/pdf/products/637/VideoMic_Datasheet_05_FA.pdf',['Rode Vider Mic Rycote'],'VideoMic Rycote',{brand:'RØDE',brandZh:'',brandEn:'RØDE'});
alias('amaran','灯光器材','https://amarancreators.com/pages/amaran-300c',['300c'],'300c');
alias('Aputure','灯光器材','https://aputure.com/en-US/products/ls-300x',['300X','光风暴 Bi Color LS 300X'],'LS 300x',{series:'光风暴'});
alias('Aputure','灯光器材','https://docs.aputure.com/hubfs/Knowledge%20Base/company%20files/Accessory-Compatibility-Sheet_2023-11-15a.pdf',['光风暴 LS C300d II'],'LS C300d II',{series:'光风暴'});
alias('ARRI','灯光器材','https://www.arri.com/resource/blob/157560/f821e2da15b191c754a8fb31e232c197/arri-lighting-americas-product-catalog-2022-en-v1-1-data.pdf',['M18'],'M18');
for(const n of ['M8','M40','M90'])alias('ARRI','灯光器材','https://www.arri.com/resource/blob/157560/f821e2da15b191c754a8fb31e232c197/arri-lighting-americas-product-catalog-2022-en-v1-1-data.pdf',[n+' HMI'],n);
alias('ARRI','灯光器材','https://www.arri.com/resource/blob/157560/f821e2da15b191c754a8fb31e232c197/arri-lighting-americas-product-catalog-2022-en-v1-1-data.pdf',['MAX 18/12KW HMI'],'ARRIMAX 18/12');
alias('Creamsource','灯光器材','https://www.creamsource.com/wp-content/downloads/brochures/CS-vortex8-cutsheet-14072020.pdf',['Vortex 8 (V8)'],'Vortex8');
addModels('Nanlite','灯光器材','https://nanlite.com.tr/uploads/files/DMX_REFERENCE_GUIDE/Forza_60C_DMX_REFERENCE_GUIDE_EN%20V1%2020220430%20W.pdf',['Forza 60C']);
alias('Nanlite','灯光器材','https://www.nanluxamericas.com/evoke-900c',['LED 900C'],'Evoke 900C',{brand:'NANLUX',brandZh:'',brandEn:'NANLUX'});
alias('Nanlite','灯光器材','https://www.nanluxamericas.com/evoke-1200-series',['LED Evoke1200'],'Evoke 1200',{brand:'NANLUX',brandZh:'',brandEn:'NANLUX'});
alias('SONY','监看','https://pro.sony/s3/cms-static-content/uploadfile/17/1237494929017.pdf',['PVM-A170 17" HD OLED Monitor'],'PVM-A170 17″');
alias('SONY','监看','https://pro.sony/s3/cms-static-content/uploadfile/17/1237494929017.pdf',['PVM-A250 25" HD OLED Monitor'],'PVM-A250 25″');
alias('Zunzheng','监看','https://zunzheng.com/firmware-download-new/',['(FSI) LCD AM210 21"'],'AM210');
alias('Zunzheng','监看','https://zunzheng.com/firmware-download-new/',['(FSI) OLED AM250 25"'],'AM250');
alias('Zunzheng','监看','https://zunzheng.com/firmware-download-new/',['(FSI) OLED CM250 25"'],'CM250');
alias('Flanders Scientific','监看','https://flandersscientific.com/support/DMSeriesManual.pdf',['DM240 24英寸监视器'],'DM240 24″');
alias('SmallHD','监看','https://guide.smallhd.com/',['702 高亮监视器'],'702 Bright');
alias('Video Devices','监看','https://www.sounddevices.com/product/pix-e7/',['PIX-E7','PIX-E7 Monitor'],'PIX-E7');
addModels('Video Devices','监看','https://www.sounddevices.com/product/pix-e5/',['PIX-E5']);
alias('TVLogic','监看','https://www.tvlogic.tv/new/support.asp',['VFM-056WP 5.6" LCD MONITOR'],'VFM-056WP 5.6″');
alias('TVLogic','监看','https://www.tvlogic.tv/new/support.asp',['5.5′′HD Monitor(055A)5'],'VFM-055A 5.5″');
alias('TVLogic','监看','https://www.tvlogic.tv/new/support.asp',['5.6′′HD Monitor(056W)5'],'VFM-056W 5.6″');
alias('TVLogic','监看','https://www.tvlogic.tv/mboard.asp?Action=view&intSeq=392&strBoardID=Press_Room',['5.8′′HD Monitor(058W)5'],'VFM-058W 5.5″');
alias('TVLogic','监看','https://www.tvlogicusa.com/new/M_Spec.asp?sidx=75',['7.5′′HD Monitor(075A)7'],'LVM-075A 7″');
alias('Vaxis','监看','https://www.vaxis.cn/product/product.php?class2=14',['暴风 058 Monitor'],'058',{series:'暴风',englishSeries:'Storm'});
alias('Vaxis','监看','https://www.vaxis.cn/product/product.php?class2=14',['暴风 072 无线监视器'],'072',{series:'暴风',englishSeries:'Storm'});
alias('Vaxis','监看','https://www.vaxis.cn/product/product.php?class2=14',['cine 8" Wireless Monitor'],'CINE8');
addModels('cmotion','摄影机附件','https://cmotion.eu/contact/download/LCS/compact',['Compact ONE']);
alias('Flowcine','移动器材','https://flowcine.com/documentation/gravity-one/',['Gravity One'],'Gravity One');
alias('TILTA','移动器材','https://flowcine.com/documentation/gravity-one/',['Gravity One'],'Gravity One',{brand:'Flowcine',brandZh:'',brandEn:'Flowcine'});
alias('Flowcine','移动器材','https://flowcine.com/documentation/black/',['The Black arm'],'Black Arm');
alias('通用','移动器材','https://flowcine.com/documentation/black/',['BLACK ARM'],'Black Arm',{brand:'Flowcine',brandZh:'',brandEn:'Flowcine'});
alias('TILTA','移动器材','https://tilta.com/shop/armorman-3-0-arm-r/',['Max Armor Man 3.0'],'Armorman 3.0');
alias('TILTA','摄影机附件','https://tilta.com/shop/armorman-3-0-arm-r/',['Armor-man 3.0'],'Armorman 3.0');
alias('Chapman','移动器材','https://www.chapman-leonard.com/product/hybrid-iv/',['Hybrid IV Dolly'],'Hybrid IV');
alias('Chapman','移动器材','https://www.chapman-leonard.com/product/super-peewee-iv/',['Super Peewee Dolly IV'],'Super PeeWee IV');
alias('GFM','移动器材','https://www.gripfactory.com/tech',['GF-Primo Dolly','GF-Primo DollyPrimo','PRIMO'],'GF-Primo Dolly');
alias('GFM','移动器材','https://www.gripfactory.com/tech',['GF-Baby Jib Arm Baby'],'GF-Baby Jib');
alias('GFM','移动器材','https://www.gripfactory.com/tech',['GF-Mini Jib Arm Mini'],'GF-Mini Jib');
alias('Panther','移动器材','https://www.panther.tv/p/foxy-pro',['Foxy Pro Crane'],'Foxy Pro');
alias('MovieBird','移动器材','https://moviebird.com/heads-2/magichead/amp/',['2-Axis Remote Head MB'],'MagicHead');
alias('Scorpio','移动器材','https://scorpio.servicevision.es/es/compra/gruas-y-cabezas/',["Super Scorpio crane 10'"],"Scorpio 10′");
alias('Scorpio','移动器材','https://scorpio.servicevision.es/es/compra/gruas-y-cabezas/',["Super Scorpio crane 23'"],"Scorpio 23′");
alias('Scorpio','移动器材','https://scorpio.servicevision.es/es/compra/gruas-y-cabezas/',["Super Scorpio crane 45'"],"Scorpio 45′");
for (const focal of [32,40,50,65,80,100]) alias('Atlas Lens Co.','镜头','https://atlaslensco.com/products/orion-silver-edition-anamorphic-lenses',[`Orion Silver Edition ${focal}mm`],`${focal}mm`,{series:'Orion Silver Edition'});

addModels('Cartoni','移动器材','https://www.cartoni.com/product-series/lambda-series-sfx/',['Lambda 25','Lambda 25 Third Axis','Lambda 50','Lambda 50 Third Axis']);
alias('DZOFilm','镜头','https://store.dzofilm.com/fr/products/dzofilm-x-tract',['X-tract 18-28mm T8'],'18-28mm T8',{series:'X-tract'});
alias('LAOWA','镜头','https://laowacine.com.cn/cinema-lens-87',['8-15mm T2.9 PL口'],'8-15mm T2.9 PL口',{series:'FF FISHEYE ZOOM'});
alias('Fujinon','镜头','https://www.fujifilm-x.com/en-us/filmmaking/',['19-90mm T2.9 zoom'],'19-90mm T2.9',{series:'Cabrio'});
alias('Fujinon','镜头','https://www.fujifilm.com/au/en/business/cine-and-broadcast/cinelens/premista/resources',['28-100mm T2.9'],'28-100mm T2.9',{series:'Premista'});
alias('ARRI','镜头','https://www.arri.com/en/camera-systems/cine-lenses/arri-signature-zoom-lenses',['1.7x Extender'],'1.7× Extender');
for (const focal of [21,24,28,35,50])alias('Leitz','镜头','https://www.leitz-cine.com/product/m-08',[`M0.8 ${focal}mm F1.4`],`${focal}mm F1.4`,{series:'M 0.8'});
for (const focal of [75,90])alias('Leitz','镜头','https://www.leitz-cine.com/product/m-08',[`M0.8 ${focal}mm F2`],`${focal}mm F2`,{series:'M 0.8'});
for (const focal of [35,50,75])alias('SIRUI','镜头','https://store.sirui.com/de/products/saturn-50-mm-75-mm-vollformat-anamorphoobjektiv-aus-kohlefaser',[`Saturn ${focal}mm T2.9 1.6× E口`],`${focal}mm T2.9 1.6× E口`,{series:'Saturn'});
// Manufacturer tables confirm these named families, not every anonymous Hawk lens.
releaseLensSources.push(
 lens('ARRI',/^Signature Zoom\b/i,'Signature Zoom','https://www.arri.com/en/cine-lenses/signature-lenses/signature-primes-zooms/signature-zooms',stops(['16-32','24-75','45-135','65-300'],'T2.8')),
 lens('ARRI',/^Ultra Prime\b/i,'Ultra Prime','https://www.arri.com/resource/blob/178226/43acf02e897c986c3ccde210d91a4c14/postcard-booklet-of-the-ultra-prime-lenses-series-data.pdf',{...stops([14,16,20,24,28,32,40,50,65,85,100,135,180],'T1.9'),10:'T2.1',12:'T2'}),
 lens('HAWK',/^V-Lite(?!.*(?:Vintage|74|1.3))\b/i,'V-Lite','https://www.vantagefilm.com/file/edee/downloads/optics/2x-hawk-anamorphic-lenses/hawk-v-lite-technical-data.pdf',{...stops([28,35,45,55,65,80],'T2.2'),110:'T3',140:'T3.5'},{squeeze:'2',macro:[55]}),
 lens('HAWK',/^Class-X\b/i,'class-X','https://www.vantagefilm.com/file/edee/downloads/optics/2x-hawk-anamorphic-lenses/hawk-class-x-technical-data.pdf',{...stops([28,35,45,55,65,80],'T2.2'),110:'T3',140:'T3.5'},{squeeze:'2',macro:[55]}),
 lens('HAWK',/^Vantage ?One4\b/i,'VantageOne4','https://www.vantagefilm.com/file/edee/downloads/optics/1x-spherical-lenses-made-by-hawk/vantageone4-technical-data.pdf',stops([19,22,27,35,42,50,65,80,105,140],'T1.4')),
 lens('HAWK',/^(?:Vantage ?)?One\b/i,'VantageOne','https://www.vantagefilm.com/file/edee/downloads/optics/1x-spherical-lenses-made-by-hawk/vantageone-technical-data-.pdf',stops([14.5,17.5,21,25,32,40,50,65,90,120],'T1')),
);

alias('ARRI','镜头','https://www.arri.com/resource/blob/178222/b15c478e3fc4eb27ab9ef998ea51fcb9/ultra-prime-8r-product-brochure-data.pdf',['Ultra Prime 8R T2.8','Ultra Prime 8Rmm T2.8'],'8R T2.8',{series:'Ultra Prime'});
alias('Canon','镜头','https://www.canon.com.cn/supports/download/sims/list/slist?Channel=4&modelName=EF+35mm+f%2F1.4L+II+USM',['EF 35mm F1.2 L II USM'],'EF 35mm F1.4L II USM');
alias('通用','移动器材','https://www.dji.com/mavic-2/info',['飞机御2pro'],'Mavic 2 Pro',{brand:'DJI',brandZh:'大疆',brandEn:'DJI',targetCategory:'摄影机'});
alias('通用','移动器材','https://www.dji.com/mavic-3-pro',['飞机御3pro'],'Mavic 3 Pro',{brand:'DJI',brandZh:'大疆',brandEn:'DJI',targetCategory:'摄影机'});
alias('DJI','移动器材','https://www.dji.com/cn/master-wheels',['摇轮'],'Master Wheels');
alias('TVLogic','监看','https://www.tvlogic.tv/mboard.asp?Action=view&intSeq=392&strBoardID=Press_Room',['058'],'VFM-058W');

alias('LAOWA','镜头','https://laowacine.com.cn/instructions',['12mm T2.9'],'12mm T2.9',{series:'Zero-D Cine'});
addModels('Aputure','灯光器材','https://aputure.com/en-US/products/mc',['MC']);
alias('Nanlite','灯光器材','https://nanliteus.com/products/nanlink-ws-tb-1-transmitter-box',['LED Mixpanel150'],'MixPanel 150');
addModels('SONY','镜头','https://www.sonystyle.com.cn/products/lenses/sel200600g/sel200600g_feature.html',['FE 200-600mm F5.6-6.3 G OSS']);
addModels('DJI','摄影机附件','https://store.dji.com/es/product/dji-focus-pro-creator-combo',['Focus Pro']);
addModels('DJI','摄影机附件','https://store.dji.com/product/dji-prossd-1tb',['PROSSD 1TB']);
alias('DJI','摄影机附件','https://www.dji.com/tb50-battery-station/specs',['TB50 智能电池'],'TB50 Intelligent Battery');
addModels('SONY','摄影机附件','https://pro.sony/es_ES/products/camera-viewfinders/dvf-el200',['DVF-EL200']);
alias('SONY','监看','https://pro.sony/en_GR/pdf/products/broadcastaudiouwpdseriesmicpackages/uwp-d11',['UWP-D11'],'UWP-D11',{targetCategory:'录音器材'});
addModels('TILTA','摄影机附件','https://tilta.com/product_support/nucleus-m/',['NUCLEUS-M']);
alias('ARRI','摄影机附件','https://www.arri.com/en/camera-systems/electronic-control-system/hi-5',['Wireless Follow Focus HI-5'],'Hi-5');
alias('ARRI','摄影机附件','https://www.arri.com/en/cine-systems/electronic-control-system/legacy/wcu-4',['WCU-4 无线跟焦器','Wireless Compact Unit 3-Axis WCU-4'],'WCU-4');
alias('ARRI','摄影机附件','https://www.arri.com/en/cine-systems/electronic-control-system/legacy/sxu-1',['Single Axis Unit SXU-1','SXU-1','Wireless Follow Focus SXU-1'],'SXU-1');
alias('ARRI','摄影机附件','https://www.arri.com/en/cine-systems/electronic-control-system/udm-1',['Ultrasonic Distance Measure UDM-1'],'UDM-1');
alias('ARRI','摄影机附件','https://www.arri.com/en/cine-systems/mechanical-accessories/follow-focus/studio-follow-focus',['Studio Follow Focus FF-4'],'FF-4');
alias('ARRI','摄影机附件','https://www.arri.com/en/cine-systems/mechanical-accessories/follow-focus/studio-follow-focus',['Studio Follow Focus FF-5'],'FF-5');
alias('ARRI','摄影机附件','https://www.arri.com/largeformat',['Electronic Vieofinder MVF-2'],'MVF-2');
alias('ATOMOS','监看','https://support.atomos.com/hc/en-us/categories/4954313185679-USER-MANUALS',['Ninja V 5英寸监视记录仪'],'Ninja V 5″');
alias('ATOMOS','监看','https://www.atomos.com/product-support/?parent=shinobi',['Shinobi 5英寸监视器'],'Shinobi 5″');
alias('ATOMOS','监看','https://support.atomos.com/hc/en-us/articles/226630747-How-do-I-assign-the-XLR-analogue-audio-input',['Shogun Flame 7英寸监视记录仪'],'Shogun Flame 7″');
alias('ATOMOS','摄影机附件','https://www.atomos-japan.com/wp-content/uploads/2023/10/SHOGUN_INFERNO_spec.pdf',['SHOGUN INFERNO 4K'],'Shogun Inferno 4K');
alias('Panther','移动器材','https://www.panther.tv/',['Classic PlusPanther','Dolly Classic Plus'],'Classic Plus');
alias('Tiffen','滤镜','https://tiffen.com/products/138mm-variable-nd-matte-box-mount-for-143mm',['138mm Matte Box Mountable VND .6-2.4'],'138mm ND 0.6–2.4',{series:'Variable ND Matte Box-Mount'});

const seriesEnglish = {'雅典娜':'ATHENA','瞬':'Simera-C','玄蜂':'VESPID PRIME','观':'GNOSIS MACRO','繁花':'Floral','光风暴':'Light Storm','暴风':'STORM'};
const compact = text => cleanText(text).toLowerCase().replace(/[\s]/g,'');
function replaceName(row, changes, source) {
  const next = {...row,...changes};
  if (changes.brand && changes.brand !== row.brand) {
    next.references = row.references.filter(ref => ref.scope !== 'brand');
    if (source) next.references.push({url:source,scope:'brand',language:'en',checkedAt});
  }
  next.name=[next.brandZh,next.brandEn,next.series,next.model].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
  next.aliases=[...new Set([row.name,...row.aliases])].filter(a=>a!==next.name);
  if(source) {
    next.namingStatus='official-model'; next.verified=true;
    next.references=[...next.references,{url:source,scope:'model',language:/\.cn|thypoch|dzofilm|nisioptics/.test(source)?'zh-CN':'en',checkedAt}];
    next.reviewNotes=[];
  }
  return next;
}

function reviewLens(row) {
  const body=cleanText([row.series,row.model].filter(Boolean).join(' '));
  const rule=releaseLensSources.find(r=>r.brand===row.brand&&r.pattern.test(body));
  if(!rule)return row;
  let model=body.replace(rule.pattern,'').replace(/\s+HAWK$/i,'').replace(/\b(?:Prime|Lenses|Lens|Zoom|Anamorphic)\b/gi,'').trim();
  model=cleanText(model).replace(/^(\d+(?:\.\d+)?-\d+(?:\.\d+)?)\s*\/\s*T/i,'$1mm T').replace(/macro\s*\/\s*T/gi,'Macro T').replace(/(\d+)macro/gi,'$1mm Macro');
  const core=model.match(/^(?:(\d+(?:\.\d+)?)\s*[x×]\s*)?(\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?)mm\s+(?:Macro\s+)?(T\d+(?:\.\d+)?)(?:\s+(Macro))?$/i);
  let result=replaceName(row,{series:rule.series,model});
  result.references=[...row.references,{url:rule.source,scope:'series',language:/\.cn/.test(rule.source)?'zh-CN':'en',checkedAt}];
  result.namingStatus='official-series';result.verified=false;
  if(!core)return result;
  const [,squeeze,focal,aperture]=core;
  const expected=rule.specs[focal];
  const isMacro=/macro/i.test(model);
  if(!expected || compact(expected)!==compact(aperture) || (squeeze && squeeze!==rule.squeeze) || (isMacro && !rule.macro?.includes(Number(focal)))) {
    result.namingStatus='pending';
    result.reviewNotes=[`官网规格与库存不一致或不覆盖此配置：焦段 ${focal}mm，光圈 ${aperture}${expected?`（官网 ${expected}）`:''}${squeeze?`，压缩比 ${squeeze}×（官网 ${rule.squeeze??'未确认'}×）`:''}`];
    return result;
  }
  return replaceName(result,{},rule.source);
}

// Generic terms are operational names rather than manufacturer product claims.
const genericEnglish = {
  '鼓风机':'Blower','黑色布基胶带':'Black Gaffer Tape','苹果箱组合':'Apple Box Set','摄影器材车':'Equipment Cart','摄影头盔':'Camera Helmet',
  '题字器':'Teleprompter','烟机':'Fog Machine','板车':'Platform Cart','车载吸盘/车载侧挂':'Vehicle Suction Mount / Side Mount','独脚架':'Monopod',
  '凤头鱼钩':'Stabilizer Support Hook','黄包车':'Camera Rickshaw','肩架':'Shoulder Rig','减震盘':'Vibration Isolator','皮轮车带气压立柱':'Pneumatic Pedestal Dolly',
  '轻型轨道一套4直3弯':'Lightweight Track Set 4 Straight / 3 Curved','轻型脚架/独脚架':'Lightweight Tripod / Monopod',
  '重型轨道一套4直3弯':'Heavy-duty Track Set 4 Straight / 3 Curved','重型直弯轨组合':'Heavy-duty Straight / Curved Track Set',
  '手机稳定器':'Smartphone Gimbal','插排':'Power Strip','黑旗/白旗':'Black / White Flag','米菠萝':'Low Stand','魔术腿':'C-Stand','束光筒':'Projection Attachment',
};
const genericTranslations=[
 [/H\/D/gi,'重型'],[/L\/T/gi,'轻型'],[/Flat-bowl Adapter/gi,'平底转碗口转接头'],[/Euro-adapter Mitchell Plate/gi,'欧式接口米切尔板'],
 [/Adjustable gas riser/gi,'可调气压立柱'],[/Ball adapter/gi,'球形转接头'],[/Bazooka base/gi,'立柱底座'],[/Bodycam\/SnorriCam/gi,'身体固定摄影支架'],
 [/Camera Wedge plate/gi,'摄影翘板'],[/Helmet Camera Rig for POV Shot/gi,'主观镜头摄影头盔支架'],[/L-Plate/gi,'L形板'],[/Ladder Pod/gi,'梯型脚架'],
 [/Narrow Gauge/gi,'窄轨'],[/Roller Spreader/gi,'带轮脚架撑杆'],[/Safety Belt Tie/gi,'安全绑带'],[/Starter Track/gi,'起始轨道'],[/Triangular ladder/gi,'三角梯'],
 [/Electronic Dimmer/gi,'电子调光器'],[/Silicon Dimmer Pack/gi,'可控硅调光箱'],[/C Clamp \(G Clamp\)/gi,'C形夹'],[/Gaffer Clamp/gi,'灯光夹'],
 [/Hanging Clamp Heavy-duty/gi,'重型悬挂夹'],[/High Overhead Wide Base Stand/gi,'宽底高位灯架'],[/Mafer Clamp/gi,'大力夹'],[/Space Clamp/gi,'空间夹'],
 [/Barrel Clamp/gi,'筒夹'],[/Standard Polecate/gi,'伸缩撑杆'],[/Selfie stand/gi,'自拍支架'],[/Subjective helmet/gi,'主观镜头摄影头盔'],
 [/Steel Stand/gi,'钢制灯架'],[/Baby Nail-on Plate/gi,'16mm接口钉板'],[/Ultra Bounce/gi,'反光布'],[/Pigtail/gi,'分接线'],
 [/Adapter/gi,'转接头'],[/Gel Frame Ear Extensions/gi,'色纸框耳延长杆'],[/Pipe Frame Ear/gi,'管制框耳'],

  [/Apple Box/g,'苹果箱'],[/Director's Chair/gi,'导演椅'],[/Monitor stand/gi,'监视器支架'],[/Dust cover/gi,'防尘罩'],[/Rain Cover|Rian Cover/gi,'防雨罩'],
  [/Matte Box/gi,'遮光斗'],[/Rain Deflector/gi,'雨刷装置'],[/French Flag w\/Arm/gi,'带臂遮光旗'],[/Hi-?hat/gi,'低脚架'],
  [/Flat Screen Monitor Mount/gi,'平板监视器支架'],[/Teleprompter/gi,'题字器'],[/Sand Bag/gi,'沙袋'],[/Wood Wedges|Wedges/gi,'木楔'],[/Wooden Triangle/gi,'三角木'],
  [/Dolly Track/gi,'移动车轨道'],[/Straight/gi,'直轨'],[/Curve[d]?/gi,'弯轨'],[/Platform Dolly/gi,'平台车'],[/Doorway Dolly/gi,'门道车'],[/Car Mount/gi,'车载支架'],
  [/Shoulder/gi,'肩架'],[/Spreader/gi,'脚架撑杆'],[/Suction Cup/gi,'吸盘'],[/Cheese Plate/gi,'多孔板'],[/Riser/gi,'增高柱'],[/Walk-?Up Scaffold[s]?/gi,'移动脚手架'],
  [/Frame/gi,'框架'],[/Double Scrim/gi,'双层减光纱'],[/Single Scrim/gi,'单层减光纱'],[/Cutter Flag/gi,'遮光旗'],[/Soft Eggcrate/gi,'软蜂巢'],[/Solid Black/gi,'黑布'],
  [/Unbleached\/Bleached Muslin/gi,'原色/漂白棉布'],[/Quarter Grid Cloth/gi,'四分之一格栅柔光布'],[/Half Grid Cloth/gi,'半格栅柔光布'],[/Full Grid Cloth/gi,'全格栅柔光布'],
  [/Steel Mirror Reflector/gi,'钢镜反光板'],[/Mirror Reflector/gi,'镜面反光板'],[/Silk/gi,'丝绸柔光布'],[/Digital Green Screen/gi,'数码绿幕'],
  [/Power Cable/gi,'电源线'],[/Dist\. Box 3 Phase/gi,'三相配电箱'],[/Magic Arm/gi,'魔术臂'],[/Lighting Console/gi,'灯光控制台'],[/Generator/gi,'发电机'],
  [/Grip Head/gi,'夹头'],[/Grid Clamp/gi,'网格夹'],[/Aluminum Pipe|Aluminium tube|Aluminum tube/gi,'铝管'],[/Plastic Basket/gi,'塑料篮'],[/Steel Stand Cart/gi,'灯架车'],
  [/Fiber Glass Ladder/gi,'玻璃纤维梯'],[/TRUSS/gi,'桁架'],[/Stand Adapter/gi,'灯架转接头'],[/Swivelling Clamp/gi,'旋转夹'],[/Telescoping Arm/gi,'伸缩臂'],
];

export function applyReleaseReview(input) {
  let row=input;
  if(row.category==='镜头')row=reviewLens(row);
  const body=[row.series,row.model].filter(Boolean).join(' ');
  const exact=exactModels.find(r=>(r.matchBrand??r.brand)===row.brand&&r.category===row.category&&compact(r.input)===compact(body));
  if(exact)row=replaceName(row,{category:exact.targetCategory??row.category,brand:exact.brand,brandZh:exact.brandZh??row.brandZh,brandEn:exact.brandEn??row.brandEn,series:exact.series??'',model:exact.model,englishSeries:exact.englishSeries},exact.source);
  // Known redundant spelling, not a different lens generation.
  if(row.brand==='SONY'&&body==='FE FE 14mm F1.8 GM')row=replaceName(row,{series:'',model:'FE 14mm F1.8 GM'},'https://www.sonystyle.com.cn/minisite/di/img/gmaster_10th_anniv/index.html');
  if(row.brand==='Thypoch'&&/^\d+mm T1\.5 E口$/.test(row.model)&&[21,28,35,50,75].includes(Number(row.model.match(/^\d+/)[0])))row=replaceName(row,{},'https://store.thypoch.com/collections/simera-c');
  if(row.brand==='Angénieux'&&/^Type EZ-[12]$/.test(row.series)&&/ - PL$/.test(row.model)) {
    const family=families.find(f=>f.brand===row.brand&&f.series===row.series);
    const core=row.model.replace(/ - PL$/,'');const [focal,aperture]=core.split(' ');
    if(family?.specs[focal.replace('mm','')]===aperture)row=replaceName(row,{model:`${core} PL口`},family.source);
  }
  const englishRegional={'CineAltaV':'VENICE','CineAltaV 2':'VENICE 2','CineAltaB':'BURANO'};
  const modelEnglish=(englishRegional[row.model]??row.model).replace(/E口/g,'E Mount').replace(/PL口/g,'PL Mount').replace(/RF口/g,'RF Mount').replace(/LPL口/g,'LPL Mount').replace(/微距/g,'Macro');
  if(row.brand==='Insta360')row=replaceName(row,{brandZh:'影石'});
  row.englishName=[row.brandEn,row.englishSeries??seriesEnglish[row.series]??row.series,modelEnglish].filter(Boolean).join(' ');
  row.published=row.namingStatus==='official-model';
  row.releaseReason=row.published?'官方型号和现有规格一致':'搜索后仍无法唯一确定完整型号或规格，移出发布器材库';
  if(row.namingStatus==='generic') {
    const en=genericEnglish[row.model];
    const prohibited=/待|型号|莫孚康|铁头|阿童木|尊正|青峰|青牛|鲨鱼|小米|印迹|锐鹰|罗兰|森海塞尔|章鱼|阅流|\b(?:KO|CODEX|AJA|2575D|FS-T6|GF-|F7 |QF|RT-Mini|Jimmy Jib|Ready Rig|MovieBrid|N2|Walter|SoftSun|Lightning|X-Lite|LED (?:C\d|RX-|LITE|55)|Rode|H6|F8)\b|#|Firewire|Skater Mini|Strato-Safe|Mini Safe|China Dolly|Modular extension|\($/i.test(row.model);
    const descriptive=/chair|cover|stand|mount|plate|clamp|adapter|pipe|riser|dolly|track|ladder|scaffold|scrim|cloth|muslin|silk|flag|frame|eggcrate|solid black|ultra bounce|reflector|cable|pigtail|dist\. box|dimmer|generator|sand bag|basket|truss|wood|wedge|magic arm|grip head|hat|spreader|helmet|bodycam|safety belt|teleprompter|lighting console|\bbazooka\b/i.test(row.model);
    row.published=!prohibited&&!!(en||descriptive);
    row.releaseReason=row.published?'通用现场器材名称及标示尺寸已复核，无厂商品牌归属推断':'包含品牌/型号线索或功能描述不足，移出发布器材库';
    row.englishName=en??row.model.replace(/Rian Cover/gi,'Rain Cover');
    if(!en) {
      let zh=row.model.replace(/(\d+(?:\.\d+)?M(?:×\d+M)?)\1/gi,'$1');for(const [pattern,translation]of genericTranslations)zh=zh.replace(pattern,translation);
      row=replaceName(row,{model:zh});
      const residual=zh.replace(/(?:Mitchell Base|Bowl Base|w\/|Baby Pin|Jr\. Male Pin|\b(?:HMI|DMX|POV|KW|L|C|M|ft|cm|mm|m|sec)\b)/gi,'').replace(/[\d\s\W_]+/g,'');
      if (/[a-z]{3,}/i.test(residual)) {row.published=false;row.releaseReason='功能或规格描述仍不清楚，移出发布器材库';}
    }
  }
  if(/[\u3400-\u9fff]/.test(row.englishName)) {
    // The final policy translates functional descriptions without inventing official brand names.
    row.published=false;row.releaseReason='英文型号或通用描述无法可靠补齐，移出发布器材库';
  }
  delete row.englishSeries;
  row.reviewedAt=checkedAt;
  return amendPublication(row,releaseLensSources,exactModels);
}
