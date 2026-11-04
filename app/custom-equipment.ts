import type { ProjectCustomEquipment, ProjectKitItem } from "./project-state.ts";

/** Unnamed custom rows remain editable drafts and never represent equipment. */
export function isBlankCustomKitItem(row: Pick<ProjectKitItem, "custom">) {
  return Boolean(row.custom && !row.custom.name.trim());
}

export function createCustomKitRow<Category extends string>(id: string, category: Category): ProjectKitItem<Category> {
  return {
    id,
    qty: 1,
    note: "",
    reason: "自定义器材",
    status: "manual",
    draft: true,
    custom: { name: "", brand: "通用", category, subcategory: "自定义", unit: "件" },
  };
}

export function updateCustomKitRow<Category extends string>(
  row: ProjectKitItem<Category>,
  patch: Partial<ProjectCustomEquipment<Category>>,
): ProjectKitItem<Category> {
  if (!row.custom) return row;
  const custom = { ...row.custom, ...patch };
  // Preserve typed whitespace until persistence, so English names can be entered naturally.
  const next = {
    ...row,
    custom: {
      ...custom,
      name: custom.name.slice(0, 240),
      brand: custom.brand.slice(0, 120),
      subcategory: custom.subcategory.slice(0, 120),
      unit: custom.unit.slice(0, 20),
    },
  };
  if (isBlankCustomKitItem(next)) next.draft = true;
  else delete next.draft;
  return next;
}

export function applyEquipmentSuggestion<Category extends string>(
  rows: ProjectKitItem<Category>[],
  draftId: string,
  suggestion: { id: string; name: string; unit?: string },
): ProjectKitItem<Category>[] {
  const draftIndex = rows.findIndex((row) => row.id === draftId && row.custom);
  if (draftIndex < 0) return rows;
  const source = rows[draftIndex];
  const existingIndex = rows.findIndex((row, index) => index !== draftIndex && row.id === suggestion.id);
  if (existingIndex >= 0) {
    const existing = rows[existingIndex];
    const total = existing.qty + source.qty;
    const notes = [...new Set([existing.note, source.note].filter((note) => note.trim()))];
    // Put overflow evidence first so a later note-length bound cannot hide it.
    if (total > 999) notes.unshift(`合并前合计 ${total}，超过单行上限，请核对数量`);
    return rows.flatMap((row, index) => {
      if (index === draftIndex) return [];
      if (index !== existingIndex) return [row];
      return [{ ...existing, qty: Math.min(999, total), note: notes.join("；"), status: "manual" as const, userAdjusted: true }];
    });
  }
  return rows.map((row, index) => {
    if (index !== draftIndex) return row;
    const selected = {
      ...source, id: suggestion.id, reason: `从联想选择：${suggestion.name}`,
      status: "manual" as const, userAdjusted: true,
    };
    delete selected.custom;
    delete selected.draft;
    return selected;
  });
}
