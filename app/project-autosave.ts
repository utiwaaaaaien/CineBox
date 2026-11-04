export const autosaveKey = "cinbox-autosave-v1";
export const autosaveIntervalMs = 60_000;

export type AutosavePayload = {
  projects: readonly unknown[];
  activeProjectId: string;
  historyOverrides: object;
};

export type ProjectAutosave = { version: 1; savedAt: string; payload: AutosavePayload };
type AutosaveStorage = Pick<Storage, "getItem" | "setItem">;

// Restoring callers still sanitize project records and resolve catalog identities.
export function readProjectAutosave(storage?: AutosaveStorage): ProjectAutosave | null {
  try {
    const target = storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    const raw = target?.getItem(autosaveKey);
    if (!raw) return null;
    const snapshot: unknown = JSON.parse(raw);
    if (!snapshot || typeof snapshot !== "object") return null;
    const value = snapshot as Partial<ProjectAutosave>;
    if (value.version !== 1 || typeof value.savedAt !== "string" || !Number.isFinite(Date.parse(value.savedAt))) return null;
    const payload = value.payload;
    if (!payload || !Array.isArray(payload.projects) || !payload.projects.length ||
      typeof payload.activeProjectId !== "string" || !payload.historyOverrides ||
      typeof payload.historyOverrides !== "object" || Array.isArray(payload.historyOverrides)) return null;
    return value as ProjectAutosave;
  } catch {
    return null;
  }
}

export function createProjectAutosaveWriter(storage: AutosaveStorage, now = () => new Date().toISOString()) {
  const previous = readProjectAutosave(storage);
  let savedAt = previous?.savedAt ?? null;
  let savedPayload = previous ? JSON.stringify(previous.payload) : null;
  return {
    save(payload: AutosavePayload): { savedAt: string | null; error: string | null } {
      try {
        const serialized = JSON.stringify(payload);
        if (serialized !== savedPayload) {
          const nextSavedAt = now();
          storage.setItem(autosaveKey, JSON.stringify({ version: 1, savedAt: nextSavedAt, payload }));
          savedAt = nextSavedAt;
          savedPayload = serialized;
        }
        return { savedAt, error: null };
      } catch {
        return { savedAt, error: "自动存档失败，请导出项目备份并检查浏览器存储权限或可用空间。" };
      }
    },
  };
}

// Recover history independently when its storage key is missing or corrupt.
export function readStoredHistory<T>(storage: AutosaveStorage, sanitize: (value: unknown) => T, preferredSnapshot?: ProjectAutosave | null) {
  if (preferredSnapshot) return { value: sanitize(preferredSnapshot.payload.historyOverrides), recovered: true, failed: false };
  try {
    const raw = storage.getItem("cinbox-history-overrides-v1");
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid history state");
      return { value: sanitize(parsed), recovered: false, failed: false };
    }
  } catch {
    const snapshot = readProjectAutosave(storage);
    return { value: sanitize(snapshot?.payload.historyOverrides ?? {}), recovered: Boolean(snapshot), failed: !snapshot };
  }
  const snapshot = readProjectAutosave(storage);
  return { value: sanitize(snapshot?.payload.historyOverrides ?? {}), recovered: Boolean(snapshot), failed: false };
}
