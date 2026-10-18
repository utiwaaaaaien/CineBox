export type BrandProfile = {
  display: string;
  short: string;
  website?: string;
  logo?: string;
  tone: "plain" | "bold" | "wide" | "serif" | "compact";
};

const profiles: Record<string, Partial<BrandProfile>> = {
  ARRI: { website: "https://www.arri.com/en", tone: "wide" },
  Cooke: { website: "https://cookeoptics.com", tone: "serif" },
  Leica: { website: "https://leica-camera.com", tone: "serif" },
  HAWK: { website: "https://www.vantagefilm.com", tone: "wide" },
  Canon: { website: "https://global.canon", tone: "bold" },
  ZEISS: { website: "https://www.zeiss.com", tone: "bold" },
  Angénieux: { website: "https://www.angenieux.com", tone: "serif" },
  SONY: { website: "https://pro.sony", tone: "serif" },
  Tiffen: { website: "https://tiffen.com", tone: "bold" },
  DJI: { website: "https://www.dji.com", tone: "wide" },
  RED: { website: "https://www.red.com", tone: "bold" },
  Nanlite: { website: "https://nanlite.com", tone: "compact" },
  DZOFilm: { website: "https://www.dzofilm.com", tone: "wide" },
  Aputure: { website: "https://aputure.com", tone: "wide" },
  TVLogic: { website: "https://tvlogic.tv", tone: "compact" },
  Nikon: { website: "https://www.nikon.com", tone: "bold" },
  SIGMA: { website: "https://www.sigma-global.com", tone: "bold" },
  LAOWA: { website: "https://www.venuslens.net", tone: "wide" },
  Vaxis: { website: "https://vaxisglobal.com", tone: "wide" },
  SmallHD: { website: "https://smallhd.com", tone: "bold" },
  Panasonic: { website: "https://www.panasonic.com", tone: "bold" },
  GoPro: { website: "https://gopro.com", tone: "bold" },
  Freefly: { website: "https://freeflysystems.com", tone: "wide" },
  OConnor: { website: "https://www.ocon.com", tone: "serif" },
  Astera: { website: "https://astera-led.com", tone: "wide" },
  TILTA: { website: "https://tilta.com", tone: "wide" },
  NiSi: { website: "https://nisioptics.com", tone: "serif" },
  ATOMOS: { website: "https://www.atomos.com", tone: "wide" },
  Insta360: { website: "https://www.insta360.com", tone: "bold" },
  amaran: { website: "https://amarancreators.com", tone: "plain" },
  通用: { display: "通用", short: "GEN", tone: "plain" },
};

export function brandProfile(brand: string): BrandProfile {
  const known = profiles[brand] ?? {};
  const display = known.display ?? brand;
  const short = known.short ?? (display.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "KIT");
  const website = known.website;
  return {
    display,
    short,
    website,
    logo: known.logo ?? (website ? `${new URL(website).origin}/favicon.ico` : undefined),
    tone: known.tone ?? "plain",
  };
}
