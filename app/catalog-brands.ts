// Editorial shortcuts approved for CineBox's category menus, not market-share rankings.
export const commonBrandsByCategory: Record<string, readonly string[]> = {
  摄影机: ["ARRI", "SONY", "RED", "Canon", "DJI", "Panasonic", "Phantom", "Freefly", "GoPro", "Insta360"],
  镜头: ["Cooke", "ZEISS", "Angénieux", "Leica", "Leitz", "ARRI", "HAWK", "Canon", "Fujinon", "DZOFilm", "LAOWA", "SIGMA", "NiSi", "Thypoch", "Nikon", "SIRUI", "7Artisans"],
  滤镜: ["Tiffen", "NiSi", "Schneider", "ARRI", "ZEISS", "Canon", "通用"],
  摄影机附件: ["ARRI", "TILTA", "DJI", "OConnor", "Preston", "cmotion", "CODEX", "Lexar", "SWIT", "MOVCAM", "MOVMAX", "通用"],
  监看: ["SmallHD", "TVLogic", "ATOMOS", "Zunzheng", "Flanders Scientific", "SONY", "Vaxis", "SWIT", "Transvideo"],
  移动器材: ["TERIS", "Scorpio", "GFM", "Sachtler", "DJI", "OConnor", "Cartoni", "Steadicam", "Easyrig", "TILTA", "Chapman", "Panther", "通用"],
  灯光器材: ["ARRI", "Aputure", "Nanlite", "NANLUX", "Astera", "Kino Flo", "amaran", "Creamsource", "Lightstar", "利帅", "Falcon Eyes", "通用"],
  录音器材: ["Sennheiser", "Schoeps", "SOUNDDEVICES", "RØDE", "ZOOM", "SONY", "DJI", "Roland", "通用"],
  其他: ["DJI", "ARRI", "TILTA", "SWIT", "通用"],
};

// These menu translations describe common Chinese usage; they do not change canonical model names.
export const menuTranslationEvidence: Record<string, { chinese: string; source: string }> = {
  RED: { chinese: "瑞德", source: "https://csw.shu.edu.tw/wp-content/uploads/2023/12/%E5%82%B3%E6%92%AD%E7%A0%94%E7%A9%B6%E8%88%87%E5%AF%A6%E8%B8%9013-2-202307.pdf" },
  "Angénieux": { chinese: "安琴", source: "https://smcftp.salonmedia.com/yu/2020%20salon%20catalog/content/Salon-Catalogue2019_content_190330.pdf" },
  Leitz: { chinese: "徕兹", source: "https://www.leitz-cine.com/product/hektor" },
  NANLUX: { chinese: "南光", source: "https://www.nanlink.com/" },
  Tiffen: { chinese: "天芬", source: "https://www.bift.edu.cn/docs/2022-07/0516ce941ba242e490881f2a8bc98744.pdf" },
  Tokina: { chinese: "图丽", source: "https://tokinaglobal.com.cn/" },
  Cartoni: { chinese: "加通尼", source: "https://stvfe.com.cn/product/sanjiaojia/50.html" },
  Steadicam: { chinese: "斯坦尼康", source: "https://zh-tw.tiffen.com/pages/steadicam" },
  Sennheiser: { chinese: "森海塞尔", source: "https://www.sennheiser.com.cn/zh-cn" },
  MOVMAX: { chinese: "移动大师", source: "https://www.movmax.cn/" },
  "Voigtländer": { chinese: "福伦达", source: "https://www.cosina.co.jp/wp/wp-content/uploads/2021/10/VM-APO35_2-CHN-V1_0.pdf" },
  "RØDE": { chinese: "罗德", source: "https://rodemic.jd.com/" },
};

export function brandMenuLabels(catalog: readonly { brand: string; brandZh?: string; brandEn?: string }[], labels: Record<string, string>) {
  const result = { ...labels };
  for (const item of catalog) {
    const chinese = item.brandZh || menuTranslationEvidence[item.brand]?.chinese;
    if (chinese) {
      const english = item.brandEn || (/[A-Za-z]/.test(item.brand) ? item.brand : "");
      result[item.brand] = [chinese, english].filter(Boolean).join(" ");
    }
  }
  return result;
}

export function brandPriority(category: string, brand: string) {
  const order = commonBrandsByCategory[category] ?? [...new Set(Object.values(commonBrandsByCategory).flat())];
  const index = order.indexOf(brand);
  return index < 0 ? order.length : index;
}
