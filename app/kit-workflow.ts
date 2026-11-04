import type { ProjectKitItem } from "./project-state";

export type KitHistory<Category extends string = string> = {
  past: Array<{ rows: ProjectKitItem<Category>[]; label: string; group?: string; requirementsChanged?: boolean; requirementsRevision?: number }>;
  future: Array<{ rows: ProjectKitItem<Category>[]; label: string; requirementsChanged?: boolean; requirementsRevision?: number }>;
};

export function recordKitChange<Category extends string>(history: KitHistory<Category>, before: ProjectKitItem<Category>[], label: string, group?: string, requirementsChanged = false, requirementsRevision = 0): KitHistory<Category> {
  const previous = history.past.at(-1);
  const past = group && previous?.group === group && (previous.requirementsRevision ?? 0) === requirementsRevision && !history.future.length
    ? history.past
    : [...history.past, { rows: before, label, group, requirementsChanged, requirementsRevision }].slice(-30);
  return { past, future: [] };
}

export function travelKitHistory<Category extends string>(history: KitHistory<Category>, current: ProjectKitItem<Category>[], direction: "undo" | "redo", requirementsChanged = false, requirementsRevision = 0) {
  const source = direction === "undo" ? history.past : history.future;
  const entry = source.at(-1);
  if (!entry) return undefined;
  return {
    rows: entry.rows,
    label: entry.label,
    requirementsChanged: (entry.requirementsRevision ?? 0) === requirementsRevision ? entry.requirementsChanged ?? false : requirementsChanged,
    history: direction === "undo"
      ? { past: history.past.slice(0, -1), future: [...history.future, { rows: current, label: entry.label, requirementsChanged, requirementsRevision }] }
      : { past: [...history.past, { rows: current, label: entry.label, requirementsChanged, requirementsRevision }], future: history.future.slice(0, -1) },
  };
}

export function addKitSelection<Category extends string>(current: ProjectKitItem<Category>[], additions: ProjectKitItem<Category>[]) {
  const existing = new Set(current.map((row) => row.id));
  const unique = additions.filter((row) => {
    if (existing.has(row.id)) return false;
    existing.add(row.id);
    return true;
  });
  return unique.length ? [...current, ...unique] : current;
}

export function describeKitChange<Category extends string>(current: ProjectKitItem<Category>[], next: ProjectKitItem<Category>[]) {
  const before = new Map(current.map((row) => [row.id, row]));
  const after = new Set(next.map((row) => row.id));
  return {
    added: next.filter((row) => !before.has(row.id)),
    removed: current.filter((row) => !after.has(row.id)),
    changed: next.filter((row) => before.has(row.id) && JSON.stringify(before.get(row.id)) !== JSON.stringify(row)),
  };
}

export function frameSelection(value: string) {
  const dimensions = value.split(/[:：]/).map(Number);
  const vertical = dimensions.length === 2 && dimensions.every(number => Number.isFinite(number) && number > 0) && dimensions[0] < dimensions[1];
  return { aspectRatio: value, screenFormat: vertical ? "竖屏" : value === "横竖双构图" ? "横竖双版本" : "横屏" };
}

export function captureAtFrameRate(styles: string[], baseFps: number, highSpeedFps: number) {
  const other = styles.filter((style) => style !== "高帧率");
  return highSpeedFps > baseFps ? [...other, "高帧率"] : other;
}

// Shared requirements use the largest target quantity, never the sum of checks.
export function completeKitAdditions<Category extends string>(current: ProjectKitItem<Category>[], additions: ProjectKitItem<Category>[]) {
  const rows = current.map(row => ({ ...row, ...(row.custom ? { custom: { ...row.custom } } : {}) }));
  const positions = new Map(rows.map((row, index) => [row.id, index]));
  for (const addition of additions) {
    const position = positions.get(addition.id);
    if (position === undefined) {
      positions.set(addition.id, rows.length);
      rows.push({ ...addition, ...(addition.custom ? { custom: { ...addition.custom } } : {}) });
    } else if (addition.qty > rows[position].qty) {
      rows[position] = { ...rows[position], qty: addition.qty, status: "pending" };
    }
  }
  return rows;
}
