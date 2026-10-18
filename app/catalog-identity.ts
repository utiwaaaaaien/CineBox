import { canonicalEquipmentRedirects } from "./equipment-catalog.canonical.ts";

export function resolveCatalogId(id: string) {
  return Object.hasOwn(canonicalEquipmentRedirects, id) ? canonicalEquipmentRedirects[id] : id;
}

export function migrateCatalogKit(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  const rows: Record<string, unknown>[] = [];
  const byId = new Map<string, Record<string, unknown>>();
  const originalIds = new Set<string>();
  for (const candidate of value.slice(0, 5_000)) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const raw = candidate as Record<string, unknown>;
    if (typeof raw.id !== "string") continue;
    if (originalIds.has(raw.id)) continue;
    originalIds.add(raw.id);
    const id = raw.custom ? raw.id : resolveCatalogId(raw.id);
    const row: Record<string, unknown> = { ...raw, id };
    const previous = byId.get(id);
    if (previous && (id !== raw.id || previous.originalCatalogId)) {
      const quantity = (item: Record<string, unknown>) => typeof item.qty === "number" && Number.isFinite(item.qty) ? Math.min(999, Math.max(1, Math.round(item.qty))) : 1;
      const total = quantity(previous) + quantity(row);
      previous.qty = Math.min(999, total);
      previous.note = [...new Set([previous.note, row.note].filter(v => typeof v === "string" && v))].join("；");
      if (total > 999) previous.note = `${previous.note || ""}；迁移前合计 ${total}，超过单行上限，请核对数量`;
      previous.reason = [...new Set([previous.reason, row.reason].filter(v => typeof v === "string" && v))].join("；");
      if (previous.status !== row.status) previous.status = "pending";
      previous.userAdjusted = Boolean(previous.userAdjusted || row.userAdjusted);
    } else {
      if (id !== raw.id) row.originalCatalogId = raw.id;
      rows.push(row); byId.set(id, row);
    }
  }
  return rows.map(row => { const clean = { ...row }; delete clean.originalCatalogId; return clean; });
}

export function migrateCatalogProjects(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map(project => project && typeof project === "object" && !Array.isArray(project)
    ? { ...project, kit: migrateCatalogKit(project.kit) } : project);
}

export function migrateCatalogHistory(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, raw]) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [key, raw];
    const profile = raw as Record<string, unknown>;
    if (!Array.isArray(profile.items)) return [key, raw];
    const quantities = new Map<string, number>();
    const inputQuantities = profile.quantities && typeof profile.quantities === "object" ? profile.quantities as Record<string, unknown> : {};
    const items = profile.items.filter((id): id is string => typeof id === "string");
    for (const oldId of new Set(items)) {
      const id = resolveCatalogId(oldId);
      const rawQty = Object.hasOwn(inputQuantities, oldId) ? inputQuantities[oldId] : 1;
      const qty = typeof rawQty === "number" && Number.isFinite(rawQty) ? Math.min(99, Math.max(1, Math.round(rawQty))) : 1;
      quantities.set(id, Math.min(99, (quantities.get(id) || 0) + qty));
    }
    return [key, { ...profile, items: [...new Set(items.map(resolveCatalogId))], quantities: Object.fromEntries(quantities) }];
  }));
}
