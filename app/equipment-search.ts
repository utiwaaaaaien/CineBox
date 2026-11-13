import { menuTranslationEvidence } from "./catalog-brands.ts";

export type SearchableEquipment = {
  name: string;
  brand: string;
  brandZh?: string;
  brandEn?: string;
  category?: string;
  subcategory?: string;
  series?: string;
  model?: string;
  englishName?: string;
  aliases?: readonly string[];
};

function normalizeSearch(value: string) {
  return value.normalize("NFKC").normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/(\d)\s*(?:mm\s*)?[-‐‑–—~〜至到]\s*(?=\d)/g, "$1-");
}

function compactSearch(value: string) {
  return value.replace(/[\s\u200b_\-‐‑–—/\\·•.，,（()）]+/g, "");
}

function searchTerms(value: string) {
  return value.match(/\d+(?:\.\d+)?-\d+(?:\.\d+)?(?:mm)?|\p{Script=Han}+|(?:(?!\p{Script=Han})[\p{L}\p{N}])+(?:\.\d+)?/gu) ?? [];
}

const searchableFields = new WeakMap<SearchableEquipment, { fields: string[]; compact: string[]; words: Set<string>; description: string }>();

function indexEquipment(item: SearchableEquipment) {
  const cached = searchableFields.get(item);
  if (cached) return cached;
  const fields = [
    item.name, item.englishName, item.brand, item.brandZh, item.brandEn,
    menuTranslationEvidence[item.brand]?.chinese, item.series, item.model, ...(item.aliases ?? []),
  ].filter((value): value is string => !!value).map(normalizeSearch);
  const description = normalizeSearch([item.category, item.subcategory].filter(Boolean).join(" "));
  const words = new Set([...fields, description].flatMap(searchTerms));
  for (const word of words) {
    const modelPrefix = word.match(/^[a-z]{2}(?=\d)/)?.[0];
    if (modelPrefix) words.add(modelPrefix);
  }
  const entry = { fields, compact: fields.map(compactSearch), words, description };
  searchableFields.set(item, entry);
  return entry;
}

/** Exact names and aliases still rank first. Separate keywords can match different fields in any order. */
export function createEquipmentRanker(query: string) {
  const normalized = normalizeSearch(query);
  const key = compactSearch(normalized);
  const terms = searchTerms(normalized);
  if (!key) return null;

  const rangeTerms = terms
    .filter((term) => /^\d+(?:\.\d+)?-\d/.test(term))
    .map((term) => term.replace(/mm$/, ""));
  // Short qualifiers such as LF should not match inside unrelated words. FX also matches FX3, FX6, etc.
  const shortTerms = terms.length > 1
    ? terms.filter((term) => /^[a-z]{2}$/.test(term) && !/^[ivx]+$/.test(term))
    : [];
  const boundedTerms = new Set([...shortTerms, ...rangeTerms, ...rangeTerms.map((term) => `${term}mm`)]);

  return (item: SearchableEquipment) => {
    const { fields, compact, words, description } = indexEquipment(item);
    const allFields = [...fields, description];
    if (rangeTerms.some((term) => !words.has(term) && !words.has(`${term}mm`))) return Infinity;
    if (shortTerms.some((term) => !words.has(term))) return Infinity;

    if (compact.includes(key)) return 0;
    if (compact.some((field) => field.startsWith(key))) return 1;
    if (compact.some((field) => field.includes(key)) || compactSearch(description).includes(key)) return 2;

    const matches = terms.length > 0 && terms.every((term) =>
      boundedTerms.has(term) || allFields.some((field) => field.includes(term)) ||
      (/^[a-z]+\d/.test(term) && compact.some((field) => field.includes(compactSearch(term)))),
    );
    return matches ? 3 : Infinity;
  };
}

export function createEquipmentMatcher(query: string) {
  const rank = createEquipmentRanker(query);
  return (item: SearchableEquipment) => !rank || Number.isFinite(rank(item));
}
