// Naming evidence is separate from the V4 inventory. Never treat a workbook label as an official name.
export const checkedAt = "2026-10-07";
export const brandNames = {
  ARRI: ["阿莱", "ARRI", "https://www.arri.com/resource/blob/127824/9d652bdf4480124850df62b824f2d47e/arri-lighting-handbook-chinese-data.pdf"],
  SONY: ["索尼", "SONY", "https://www.sony.com.cn/content/sonyportal/zh-cn/cms/newscenter/product/2021/20211116-1.html"],
  Canon: ["佳能", "Canon", "https://www.canon.com.cn/product/eosc80/"],
  DJI: ["大疆", "DJI", "https://store.dji.com/cn/product/dji-ronin-4d"],
  Cooke: ["库克", "Cooke", "https://cookeoptics.cn/jingtou/"],
  ZEISS: ["蔡司", "ZEISS", "https://www.zeiss.com.cn/photonics-and-optics/home.html"],
  NiSi: ["耐司", "NiSi", "https://www.nisioptics.com/about-nisi"],
  Aputure: ["爱图仕", "Aputure", "https://m.aputure.cn/index.jsp"],
  amaran: ["艾蒙拉", "amaran", "https://m.aputure.cn/index.jsp"],
  "7Artisans": ["七工匠", "7Artisans", "https://www.7artisans.com/"],
  DZOFilm: ["东正", "DZOFILM", "https://dzofilm.com/cn/blog/wikis/2"],
  LAOWA: ["老蛙", "LAOWA", "https://www.venuslens.com/"],
  SIRUI: ["思锐", "SIRUI", "https://cf.sirui.com/lens/Index/s35?lang=zh-cn"],
  SIGMA: ["适马", "SIGMA", "https://www.sigma-global.com/en/support/download/fp_Manual_FW_Ver.5.0_CS_2.pdf"],
  Leica: ["徕卡", "Leica", "https://www.leica-camera.cn/"],
  Panasonic: ["松下", "Panasonic", "https://consumer.panasonic.cn/product/"],
  Vaxis: ["威固", "Vaxis", "https://www.vaxis.cn/product/"],
  Thypoch: ["叙", "Thypoch", "https://thypoch.com/simera-c"],
  Insta360: ["影石", "Insta360", "https://news.insta360.com/untitled-10/"],
  Nikon: ["尼康", "Nikon", "https://www.nikon.com.cn/"],
  Lexar: ["雷克沙", "Lexar", "https://www.lexar.com/zh-hans/"],
  SWIT: ["视威", "SWIT", "https://cn.swit.cc/uploads/2026/02/021531394404.pdf"],
  TILTA: ["铁头", "TILTA", "https://cdn.tilta.com/wp-content/uploads/2023/01/28191111/TA-LSP8.pdf"],
  Nanlite: ["南光", "NANLITE", "https://www.nanlink.com/"],
  Fujinon: ["富士能", "FUJINON", "https://asset.fujifilm.com.cn/www/cn/files/2021-03/d2bdecb98ca8ac7b432425a74d6eb87a/CINEMAlensCatalog.pdf"],
  Zunzheng: ["尊正", "Zunzheng", "https://zunzheng.com/contact-us/"],
  // English is retained when no manufacturer Chinese brand name has been established.
  Angénieux: ["", "Angénieux", "https://www.angenieux.com/"],
  Leitz: ["", "Leitz", "https://www.leitz-cine.com/products"],
  Tiffen: ["", "Tiffen", "https://tiffen.com/collections/4x4-and-4x5-650-cinema-filters"],
  Freefly: ["", "Freefly", "https://freeflysystems.com/"],
  GoPro: ["", "GoPro", "https://gopro.com/"],
  RED: ["", "RED", "https://www.red.com/"],
  "Kino Flo": ["", "Kino Flo", "https://kinoflo.com/"],
  Nauticam: ["", "Nauticam", "https://www.nauticam.com/"],
};

const family = (brand, category, pattern, series, source, specs = {}) => ({ brand, category, pattern, series, source, specs });
const sameAperture = (focals, aperture) => Object.fromEntries(focals.map(focal => [String(focal), aperture]));
export const families = [
  family("Angénieux", "镜头", /(?:type\s+)?ez-?1/i, "Type EZ-1", "https://www.angenieux.com/wp-content/uploads/2016/09/Ang%C3%A9nieux-Type-EZ-Series.pdf", {"30-90":"T2","45-135":"T3"}),
  family("Angénieux", "镜头", /(?:type\s+)?ez-?2/i, "Type EZ-2", "https://www.angenieux.com/wp-content/uploads/2016/09/Ang%C3%A9nieux-Type-EZ-Series.pdf", {"15-40":"T2","22-60":"T3"}),
  family("Angénieux", "镜头", /(?:type\s+)?ez-?3/i, "Type EZ-3", "https://www.angenieux.com/wp-content/uploads/2023/08/brochure-EZ-EZ3-1.pdf", {"45-165":"T2.3-3","68-250":"T3.5-4.5"}),
  family("ARRI", "镜头", /master prime/i, "Master Prime", "https://www.arri.com/en/cine-lenses/arri-zeiss-fujinon-lenses/master-primes/master-primes", sameAperture([12,14,16,18,21,25,27,32,35,40,50,65,75,100,135,150], "T1.3")),
  family("ARRI", "镜头", /ultra prime/i, "Ultra Prime", "https://www.arri.com/en/cine-lenses/arri-zeiss-fujinon-lenses/legacy/ultra-prime-lenses", {...sameAperture([14,16,20,24,28,32,40,50,65,85,100,135,180],"T1.9"),12:"T2"}),
  family("ARRI", "镜头", /signature zoom/i, "Signature Zoom", "https://www.arri.com/resource/blob/225644/c83fcb0e41b5a241e75cdc399ade586e/signature-brochure-data.pdf", sameAperture(["16-32","24-75","45-135","65-300"],"T2.8")),
  family("ARRI", "镜头", /signature prime/i, "Signature Prime", "https://www.arri.com/en/cine-lenses/signature-lenses/signature-primes-zooms/signature-primes/technical-data-signature-prime", { ...sameAperture([12,15,18,21,25,29,35,40,47,58,75,95,125,150], "T1.8"), 200: "T2.5", 280: "T2.8" }),
  family("Angénieux", "镜头", /(?:full frame )?optimo prime/i, "Optimo Prime", "https://www.angenieux.com/lenses/optimo-prime-series/", { ...sameAperture([21,24,28,32,40,50,60,75,100,135], "T1.8"), 18: "T2", 200: "T2.2" }),
  family("Angénieux", "镜头", /opti(?:mo|om) style/i, "Optimo Style", "https://www.angenieux.com/wp-content/uploads/2016/01/16-40-users-manual.pdf", { "16-40": "T2.8" }),
  family("Cooke", "镜头", /(?:mini\s*)?s4\/?i/i, "S4/i", "https://cookeoptics.cn/lens/s4-i-prime/", sameAperture([12,14,16,18,21,25,27,32,35,40,50,65,75,100,135,150,180,300], "T2")),
  family("Cooke", "镜头", /\bsp3\b/i, "SP3", "https://cookeoptics.cn/lens/sp3/", sameAperture([18,25,32,50,75,100], "T2.4")),
  family("Cooke", "镜头", /anamorphic\/i full frame plus/i, "Anamorphic/i FF", "https://cookeoptics.cn/lens/anamorphic-i-ff/"),
  family("Cooke", "镜头", /anamorphic\/i(?!.*(?:full frame|\bff\b|\bsf\b))/i, "Anamorphic/i S35", "https://cookeoptics.cn/lens/anamorphic-i-s35/"),
  family("Thypoch", "镜头", /simera-c/i, "瞬", "https://thypoch.com/simera-c", sameAperture([21,28,35,50,75],"T1.5")),
  family("NiSi", "镜头", /athena|雅典娜/i, "雅典娜", "https://www.nisioptics.com/athena", {14:"T2.4",18:"T2.2",25:"T1.9",35:"T1.9",40:"T1.9",50:"T1.9",85:"T1.9",135:"T2.2"}),
  family("DZOFilm", "镜头", /vespid prime(?!\s*(?:2|ii)\b)/i, "玄蜂", "https://oldcn.dzofilm.com/products/vespid-prime/", {...sameAperture([21,25,35,40,50,75,100,125],"T2.1"),16:"T2.8"}),
  family("DZOFilm", "镜头", /gnosis(?: macro)?/i, "观", "https://dzofilm.com/lens/macro-probe/gnosis-macro", sameAperture([24,32,65,90],"T2.8")),
  family("7Artisans", "镜头", /繁花|flor[ae]l?/i, "繁花", "https://www.7artisans.com/prod_view.aspx?id=509&nid=3&typeid=129", sameAperture([37,57], "T2.9")),
  family("ZEISS", "镜头", /supreme prime(?! radiance)/i, "Supreme Prime", "https://www.zeiss.com/photonics-and-optics/en/cinematography/lenses/supreme-prime-lenses.html", {...sameAperture([18,21,25,29,35,40,50,65,85,100,135],"T1.5"),15:"T1.8",150:"T1.8",200:"T2.2"}),
  family("ZEISS", "镜头", /supreme prime radiance/i, "Supreme Prime Radiance", "https://www.zeiss.com/photonics-and-optics/en/cinematography/lenses/supreme-prime-radiance-lenses.html", sameAperture([18,21,25,29,35,40,50,65,85,100,135],"T1.5")),
  family("Leitz", "镜头", /summilux-c/i, "SUMMILUX-C", "https://www.leitz-cine.com/product/summilux-c", sameAperture([16,18,21,25,29,35,40,50,65,75,100,135],"T1.4")),
  family("Leitz", "镜头", /summicron-c/i, "SUMMICRON-C", "https://www.leitz-cine.com/product/summicron-c"),
  family("Leitz", "镜头", /elsie/i, "ELSIE", "https://www.leitz-cine.com/product/elsie"),
  family("Aputure", "灯光器材", /\bLS\s*(?:C\s*)?\d/i, "光风暴", "https://m.aputure.cn/index.jsp"),
  family("Vaxis", "监看", /storm/i, "暴风", "https://www.vaxis.cn/product/"),
];

const brandSpellings = {
  ARRI: /^(?:阿莱\s*)?(?:ARRI(?:\s*\/\s*(?:ZEISS|FUJINON))?|阿莱)\s*/i,
  SONY: /^(?:索尼\s*)?(?:SONY|索尼)\s*/i,
  Canon: /^(?:佳能\s*)?(?:Canon|Cannon|佳能)\s*/i,
  DJI: /^(?:大疆\s*)?(?:DJI|大疆)\s*/i,
  Angénieux: /^(?:安琴\s*)?(?:Ang[eé]nieux|安琴)\s*/i,
  ZEISS: /^(?:蔡司\s*)?(?:ZEISS|蔡司)\s*/i,
  Cooke: /^(?:库克\s*)?(?:Cooke|库克)\s*/i,
  Leica: /^(?:Leica|徕卡|莱卡)\s*/i,
  Leitz: /^(?:LEITZ|LEICA)\s*/i,
  DZOFilm: /^(?:DZOFILM|东正)\s*/i,
  LAOWA: /^(?:Venus\s*)?(?:LAOWA|LOWA|老蛙)\s*/i,
  NiSi: /^(?:NiSi|耐司|耐思|耐斯)\s*/i,
  Panasonic: /^(?:Panasonic|松下)\s*/i,
  Aputure: /^(?:Aputure|爱图仕)\s*/i,
  amaran: /^(?:amaran|艾蒙拉)\s*/i,
  "7Artisans": /^(?:7Artisans|七工匠)\s*/i,
  Thypoch: /^(?:Thypoch|叙)\s*/i,
  Fujinon: /^(?:FUJINON|富士能|富士龙)\s*/i,
  Zunzheng: /^(?:Zunzheng|尊正)\s*/i,
  SIRUI: /^(?:SIRUI|思锐)\s*/i,
  TILTA: /^(?:TILTA|铁头)\s*/i,
  Vaxis: /^(?:Vaxis|WEIGU|威固)\s*/i,
  OConnor: /^O'?Connor\s*/i,
  "Atlas Lens Co.": /^(?:ATLAS|ALTAS)(?: Lens Co\.)?\s*/i,
  "Kino Flo": /^(?:Kino\s*Flo|Kino)\s*/i,
  "Ronford-Baker": /^Ronford(?:-Baker)?\s*/i,
  Creamsource: /^(?:CREAME SOURCE|Creamsource)\s*/i,
  "Video Devices": /^Video Devices?\s*/i,
  TVLogic: /^TV\s*Logic\s*/i,
  MovieBird: /^Movie\s*Bird\s*/i,
};

// Literal inventory prefixes only; these do not certify a manufacturer or model.
const inventoryPrefixes = [
  ["Bausch & Lomb", /^Bausch\s*&\s*Lomb\b/i], ["Cine Magic", /^Cine Magic\b/i],
  ["Innovision Optics", /^Innovision Optics\b/i], ["ISCO", /^ISCO\b/i],
  ["Kinoptik", /^Kinoptik\b/i], ["KO Optics", /^KO Optics\b/i], ["KO", /^KO\s+Artiste\b/i],
  ["Kowa", /^Kowa\b/i], ["LUMA TECH", /^LUMA TECH\b/i], ["Nipponscope", /^Nipponscope\b/i],
  ["TLS", /^TLS\b/i], ["Voigtländer", /^Voigtländer\b/i],
  ["cmotion", /^Cmotion\b/i], ["TILTA", /^TILTA\b/i], ["ATOMOS", /^Atomos\b/i],
  ["Eartec", /^EARTEC\b/i], ["HME", /^HME\b/i], ["Magliner", /^Magliner\b/i],
  ["TVLogic", /^TV\s*logic\b/i], ["Video Devices", /^Video Devices?\b/i],
  ["Zunzheng", /^Zunzheng\b/i], ["Betz-Tools", /^Betz-Tools\b/i],
  ["Cineped", /^Cineped\b/i], ["Dana Dolly", /^Dana Dolly\b/i], ["Easyrig", /^Easyrig\b/i],
  ["Filmotechnic", /^Filmotechnic\b/i], ["Flowcine", /^Flowcine\b/i],
  ["Global Truss", /^Global Truss\b/i], ["GRIP TECH", /^GRIP TECH\b/i],
  ["KUPO", /^kupo\b/i], ["Movietech", /^Movie\s*Tech\b/i], ["Ninebot", /^Ninebot\b/i],
];

export function correctBrand(row) {
  const n = row.name;
  if(row.id === "v5-restored-2") return "Nauticam";
  if(row.brand === "通用") {
    const prefix = inventoryPrefixes.find(([,pattern]) => pattern.test(n));
    if(prefix) return prefix[0];
    if(/^东正/.test(n)) return "DZOFilm";
  }
  if (/^Kino\s+Freestyle/i.test(n)) return "Kino Flo";
  if (/^Tiffen\b/i.test(n)) return "Tiffen";
  if (/^(?:LEITZ\b|LEICA\s+(?:Summilux-C|Summicron-C|Thalia|Prime))/i.test(n) && row.category === "镜头") return "Leitz";
  if (/^(?:MOVCAM\b|斯坦尼康|Steadicam\b|Trinity\b)/i.test(n) && row.brand === "Nikon") {
    if (/^MOVCAM\b/i.test(n)) return "MOVCAM";
    if (/^Trinity\b/i.test(n)) return "ARRI";
    return "Steadicam";
  }
  if (/^FUJINON\b/i.test(n)) return "Fujinon";
  if (/^(?:LOWA|LAOWA)\b/i.test(n)) return "LAOWA";
  if (/^SIRUI\b/i.test(n)) return "SIRUI";
  if (/^Ronford\b/i.test(n)) return "Ronford-Baker";
  if (/^CREAME SOURCE/i.test(n)) return "Creamsource";
  // RED occurring in a colour description is not a RED-manufactured product.
  if (row.brand === "RED" && row.category === "滤镜") return "通用";
  return row.brand;
}

function numeric(value) { return value.replace(/(\d+)\.0(?=\D|$)/g, "$1"); }
export function cleanText(name) {
  return name.normalize("NFKC").replace(/[–—]/g, "-")
    .replace(/\b(\d+(?:\.\d+)?)\s*MM\b/gi,"$1mm")
    .replace(/\b(\d+(?:\.\d+)?)\s*mm\s*-\s*(\d+(?:\.\d+)?)\s*mm\b/gi,"$1-$2mm")
    .replace(/\b([TF])\s*\/?\s*(\d+(?:\.\d+)?)/gi,(_,t,n)=>`${t.toUpperCase()}${numeric(n)}`)
    .replace(/mm\s*\/\s*([TF])/gi,"mm $1")
    .replace(/\b([0-9.]+)\s*(?:x|×)\s*([0-9.]+)/gi,"$1×$2")
    .replace(/\b([0-9.]+)\s*\*\s*([0-9.]+)/g,"$1×$2")
    .replace(/anamorphic_i/gi,"Anamorphic/i")
    .replace(/\bs([457])i\b/gi,"S$1/i")
    .replace(/\s+/g," ").trim();
}

export function officialBrandLabel(row) {
  const [zh,en] = brandNames[row.brand] ?? [/[\u3400-\u9fff]/.test(row.brand)?row.brand:"", /[A-Za-z]/.test(row.brand)?row.brand:""];
  return [zh,en].filter(Boolean).join(" ") || "通用";
}

export function normalizeEquipment(input) {
  const row = {...input, brand:correctBrand(input)};
  const [brandZh,brandEn,brandSource] = brandNames[row.brand] ?? [/[\u3400-\u9fff]/.test(row.brand)?row.brand:"", /[A-Za-z]/.test(row.brand)?row.brand:"", ""];
  let body = cleanText(row.name);
  const spell = brandSpellings[row.brand] ?? new RegExp(`^${row.brand.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\s*`,"i");
  body = body.replace(spell, "").trim();
  if(row.brand === "ARRI" && row.category === "镜头") {
    // Rental abbreviations identify optical families, not interchangeable specifications.
    body = body.replace(/^MP(?=\s|\d|基本组|$)/i,"Master Prime")
      .replace(/^SP(?=\s|\d|基本组|$)/i,"Signature Prime")
      .replace(/^UP(?=\s|\d|基本组|$)/i,"Ultra Prime");
  }
  const references = brandSource ? [{url:brandSource,scope:"brand",language:brandZh?"zh-CN":"en",checkedAt}] : [];
  let series = "";
  let model = body || "型号待核验";
  let status = row.brand === "通用" ? "generic" : "pending";
  let notes = [];
  if(row.id === "v5-restored-2") {
    model="ALEXA Mini 潜水壳(配置待核验)";
    notes.push("原库存明确记录 Nauticam，潜水壳具体配置待核验");
  }
  if(row.brand !== "通用" && !brandSource) notes.push("品牌沿用库存标识，官方品牌名称及型号待核验");
  if(row.brand === "通用" && (["镜头","滤镜","摄影机"].includes(row.category) || /FLIGHT HEAD|TANGO|Twister|BLACK ARM/i.test(body))) {
    status="pending";
    notes.push("品牌或具体型号未确认，保留原始规格待核验");
  }
  const matched = families.find(f => f.brand===row.brand && f.category===row.category && f.pattern.test(body));
  if(matched && !/mini\s*s4/i.test(body)) {
    series = matched.series;
    model = row.brand === "Aputure" ? body : body.replace(matched.pattern," ").trim();
    if (row.brand === "NiSi") model = model.replace(/prime|雅典娜|athena/gi," ").trim();
    if (row.brand === "Angénieux" && /^Type EZ/.test(series)) model = model.replace(/^zoom\s*/i, "").replace(/安琴变焦镜头$/," ");
    if(row.brand === "Angénieux" && series === "Optimo Prime") model=model.replace(/\bfull frame\b/gi, "").trim();
    if(row.brand === "7Artisans") model = model.replace(/系列|电影镜头/g,"").trim();
    if(row.brand === "DZOFilm" && series === "观") model = model.replace(/\bmacro\b/gi," ").trim();
    model = cleanText(model);
    const focal = model.match(/\b(\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?)mm\b/i)?.[1];
    const aperture = model.match(/\bT\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?/i)?.[0];
    const expected = focal && matched.specs[focal];
    if (expected && aperture && expected.toLowerCase() !== aperture.toLowerCase()) {
      notes.push(`原始光圈 ${aperture} 与官网 ${expected} 不一致，保留原始规格待核验`);
      status = "pending";
    } else {
      // Extra inventory specifications (mount, rehousing, sets) need their own evidence.
      const exactCore = /^\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?mm\s+T\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?$/.test(model);
      status = expected && aperture && exactCore ? "official-model" : "official-series";
    }
    if(/detuned|特调|改装|TLS/i.test(body)) {
      status="pending";
      notes.push("特调或改装版本需核对实际配置，保留版本标识");
    }
    references.push({url:matched.source,scope:status === "official-model"?"model":"series",language:/cookeoptics.cn|nisioptics|7artisans|aputure.cn|vaxis.cn|thypoch.com|dzofilm.com/.test(matched.source)?"zh-CN":"en",checkedAt});
  }
  // Explicitly documented China-market names; international names remain searchable aliases.
  if(row.id === "cam-sony-venice" || row.id === "cam-sony-venice2") {
    series="CineAlta"; model=row.id.endsWith("venice2")?"CineAltaV 2":"CineAltaV";
    // Avoid repeating CineAlta in a series+model concatenation.
    series=""; status="official-model";
    references.push({url:brandNames.SONY[2],scope:"model",language:"zh-CN",checkedAt});
  }
  if(row.id === "cam-sony-burano") {
    series="";model="CineAltaB";status="official-model";
    references.push({url:"https://www.sony.com.cn/content/professional/solution/news/news_250403_1.html",scope:"model",language:"zh-CN",checkedAt});
  }
  if(row.id === "cam-sony-fx5") {
    model="ILME-FX5";status="official-model";
    references.push({url:"https://www.sony.com.cn/content/sonyportal/zh-cn/cms/newscenter/product/2026/20260724-1.html",scope:"model",language:"zh-CN",checkedAt});
  }
  if(row.id === "cam-canon-c80") {
    series="EOS";model="C80";status="official-model";
    references.push({url:brandNames.Canon[2],scope:"model",language:"zh-CN",checkedAt});
  }
  if(row.id === "cam-alexa-35") {
    series="ALEXA";model="35";status="official-model";
    references.push({url:"https://www.arri.com/en/company/press/press-releases-2022/arri-launches-new-alexa-35-camera",scope:"model",language:"en",checkedAt});
  }
  const cameraSources = {
    "cam-alexa-mini-lf": "https://www.arri.com/en/cine-systems/cine-cameras/alexa-mini-lf",
    "cam-alexa-mini": "https://www.arri.com/en/cine-systems/cine-cameras/legacy-cine-cameras/alexa-mini",
  };
  if(cameraSources[row.id]) {
    status="official-model";
    references.push({url:cameraSources[row.id],scope:"model",language:"en",checkedAt});
  }
  if(row.id === "light-aputure-600d-pro") {
    series="光风暴";model="LS 600d Pro";status="official-model";
    references.push({url:"https://m.aputure.cn/h-col-168.html",scope:"model",language:"zh-CN",checkedAt});
  }
  if(row.id === "lens-thypoch-simera-c-16-e") {
    series="瞬";model="16mm T1.9 E口";status="official-model";
    references.push({url:"https://thypoch.com/newsroom/120",scope:"model",language:"zh-CN",checkedAt});
  }
  if(row.id === "lens-sony-85") {
    model="FE 85mm F1.4 GM";status="official-model";
    references.push({url:"https://www.sonystyle.com.cn/products/lenses/sel85f14gm/sel85f14gm_feature.html",scope:"model",language:"zh-CN",checkedAt});
  }
  // Extract known series labels without asserting that an individual legacy specification was verified.
  if(!series && model === body) {
    const common = body.match(/^(ALEXA|EOS|LUMIX|Osmo|HERO|Signature Zoom|Master Anamorphic|Master Prime|Master Macro|Ultra Prime|Optimo Anamorphic A2S|Optimo Style|Optimo Ultra 12x|Type EZ|Forza|Vespid Prime|Gnosis|Simera-C|Saturn|S7\/i|S5\/i|Anamorphic\/i(?: Full Frame Plus)?|Panchro\/i Classic|Black Pro-Mist|Pro-Mist|Glimmerglass|Pearlescent)\b/i);
    if(common) {series=common[1];model=body.slice(common[0].length).trim();}
  }
  // Incomplete names are never promoted by an old V4 verified flag.
  if(/待确认|待核验|配置待|系列待/.test(body) || !model) status="pending";
  series=cleanText(series);model=cleanText(model);
  const name=[brandZh,brandEn,series,model].filter(Boolean).join(" ").replace(/\s+/g," ").trim();
  return {...row,name,brandZh,brandEn,series,model,subcategory:normalizeSubcategory(row),
    aliases:[...new Set([row.name,...row.aliases])].filter(a=>a!==name),
    verified:status === "official-model",namingStatus:status,references,reviewNotes:notes};
}

// Categories describe production functions; brand names belong in the brand fields.
function normalizeSubcategory(row) {
  const labels = {
    Camera:"摄影机", Cameras:"摄影机", LENS:"镜头", "FOLLOW FOCUS":"跟焦器",
    Slider:"滑轨", TRACK:"轨道", Dolly:"轨道车", "HMI - 镝灯":"HMI 镝灯",
    "LED light-LED 照明灯":"LED 灯具", "Super 35 变焦镜头":"Super 35 变焦镜头",
    "ATLAS 变宽镜头组":"变形宽银幕镜头组",
    "1 x Clamp Adapter ø 80 mm":"80mm 转接夹具", "ARRI cforce mini RF Motor":"跟焦马达",
  };
  if(labels[row.subcategory])return labels[row.subcategory];
  if(["ZEISS","Canon","SONY","Angenieux","ATLAS","HAWK"].includes(row.subcategory))return row.category;
  if(/[\u3400-\u9fff]/.test(row.subcategory) && !/^(?:HMI|LED|ND|RGB)\b/.test(row.subcategory)) {
    return row.subcategory.replace(/^[A-Za-z][A-Za-z0-9 &/().,_-]*\s*(?=[\u3400-\u9fff])/,"");
  }
  return row.subcategory;
}

// Exact normalized identity only. No token sorting, focal-only matching or omission of aperture/size/density.
export function identityKey(row) {
  return [row.category,row.brand,row.unit,row.name.normalize("NFKC").toLowerCase().replace(/\s/g,"")].join("|");
}

export function mergeEquipment(rows) {
  const map=new Map(), redirects={}, merged=[];
  // Existing stable application IDs take precedence over generated inventory IDs.
  const rank = row => row.id.startsWith("v51-") ? 3 : row.id.startsWith("v5-restored-") ? 2 : row.id.startsWith("eq-") ? 1 : 0;
  const ordered=[...rows].sort((a,b)=>rank(a)-rank(b));
  for(const row of ordered) {
    const key=identityKey(row), current=map.get(key);
    if(!current) {map.set(key,structuredClone(row));continue;}
    current.aliases=[...new Set([...current.aliases,...row.aliases,row.name])].filter(a=>a!==current.name);
    if(row.reviewCorrections?.length) current.reviewCorrections=[...(current.reviewCorrections??[]),...row.reviewCorrections];
    if(row.finalReviewChanges?.length) current.finalReviewChanges=[...(current.finalReviewChanges??[]),...row.finalReviewChanges];
    current.references=[...new Map([...current.references,...row.references].map(ref=>[`${ref.url}|${ref.scope}`,ref])).values()];
    // Same complete identity: keep the stable ID and the strongest documented evidence.
    if(row.verified&&!current.verified) {
      current.verified=true;current.namingStatus='official-model';current.identityBasis='official-model';
      current.reviewNotes=row.reviewNotes;current.releaseReason=row.releaseReason;current.englishName=row.englishName;
    }
    current.published=current.published||row.published;
    current.costTier=Math.max(current.costTier,row.costTier);
    redirects[row.id]=current.id;
    merged.push({removedId:row.id,retainedId:current.id,name:current.name,reason:"分类、品牌、单位及完整规范名称相同"});
  }
  return {rows:[...map.values()],redirects,merged};
}
