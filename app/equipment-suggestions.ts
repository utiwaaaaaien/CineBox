export type SuggestionEquipment = {
  id: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  aliases?: readonly string[];
  englishName?: string;
  published?: boolean;
};

function searchKey(value: string) {
  return value.normalize("NFKC").normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/[\s\u200b_\-‐‑–—/\\·•.，,（()）]+/g, "");
}

/** Suggestions retain catalogue identity; selecting an item is the caller's decision. */
export function suggestEquipment<T extends SuggestionEquipment>(catalog: readonly T[], category: string, query: string): T[] {
  const key = searchKey(query);
  if (!key) return [];
  return catalog
    .filter((item) => item.category === category && item.published !== false)
    .map((item, index) => {
      const fields = [item.name, item.brand, item.englishName ?? "", ...(item.aliases ?? [])].map(searchKey);
      const rank = Math.min(...fields.map((field) => field === key ? 0 : field.startsWith(key) ? 1 : field.includes(key) ? 2 : 3));
      return { item, rank, index };
    })
    .filter((match) => match.rank < 3)
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .slice(0, 5)
    .map((match) => match.item);
}
