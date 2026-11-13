import { createEquipmentRanker, type SearchableEquipment } from "./equipment-search.ts";

export type SuggestionEquipment = SearchableEquipment & {
  id: string;
  category: string;
  unit: string;
  published?: boolean;
};

/** Suggestions retain catalogue identity; selecting an item is the caller's decision. */
export function suggestEquipment<T extends SuggestionEquipment>(catalog: readonly T[], category: string, query: string): T[] {
  const rank = createEquipmentRanker(query);
  if (!rank) return [];
  return catalog
    .filter((item) => item.category === category && item.published !== false)
    .map((item, index) => ({ item, rank: rank(item), index }))
    .filter((match) => Number.isFinite(match.rank))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .slice(0, 5)
    .map((match) => match.item);
}
