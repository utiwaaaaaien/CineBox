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
