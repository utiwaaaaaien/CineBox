import type { CanonicalEquipmentRecord } from "./equipment-catalog.canonical";
import type { HistoryProjectProfile } from "./project-history";
import type { ProjectKitItem } from "./project-state";
import type { RuleCategory, RuleProject } from "./camera-system-rules";
import { brandPriority } from "./catalog-brands.ts";
import { createEquipmentMatcher } from "./equipment-search.ts";
import { sortEquipmentByFocalLength } from "./equipment-focal-length.ts";

export function categoryBrands(catalog: readonly CanonicalEquipmentRecord[], category: string, labels: Record<string, string>) {
  return ["全部", ...Array.from(new Set(catalog.filter((item) => category === "全部" || item.category === category).map((item) => item.brand)))
    .sort((a, b) => brandPriority(category, a) - brandPriority(category, b) || (labels[a] ?? a).localeCompare(labels[b] ?? b, "zh-CN"))];
}

export function filterCatalog(catalog: readonly CanonicalEquipmentRecord[], filters: { category: string; brand: string; query: string; namingFilter: string }) {
  const matchesQuery = createEquipmentMatcher(filters.query);
  const matches = catalog.filter((item) =>
    (filters.category === "全部" || item.category === filters.category) &&
    (filters.brand === "全部" || item.brand === filters.brand) &&
    (filters.namingFilter === "全部" || (filters.namingFilter === "official-model" ? item.brand !== "通用" : item.brand === "通用")) &&
    matchesQuery(item),
  );
  return sortEquipmentByFocalLength(matches);
}

// Historical identities remain recoverable even after they leave new selection.
export function copyHistoricalKit(profile: HistoryProjectProfile, catalog: ReadonlyMap<string, CanonicalEquipmentRecord>): ProjectKitItem<RuleCategory>[] {
  const rows = new Map<string, ProjectKitItem<RuleCategory>>();
  for (const originalId of new Set(profile.items)) {
    const item = catalog.get(originalId);
    if (!item) continue;
    const qty = Math.min(999, Math.max(1, Math.round(profile.quantities?.[originalId] ?? 1)));
    const existing = rows.get(item.id);
    if (existing) existing.qty = Math.min(999, existing.qty + qty);
    else rows.set(item.id, {
      id: item.id, qty, note: "",
      reason: `历史项目复用：${profile.customName || profile.projectName || profile.label}`,
      status: "pending",
    });
  }
  return [...rows.values()];
}

// Compatibility checks use visible project specifications and selected equipment.
// Old questionnaire answers are retained in backups but do not affect selection.
export function basicSystemProject(project: RuleProject): RuleProject {
  return {
    type: project.type, days: project.days, cameraCount: project.cameraCount,
    screenFormat: project.screenFormat, resolution: project.resolution,
    baseFps: project.baseFps, highSpeedFps: project.highSpeedFps,
    scale: "标准", monitoring: "精简监看", captureStyle: [], sceneConditions: [],
    manualSelection: true,
  };
}
