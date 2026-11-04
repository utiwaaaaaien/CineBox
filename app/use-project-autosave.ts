"use client";

import { useEffect, useRef, useState } from "react";
import { autosaveIntervalMs, createProjectAutosaveWriter, readProjectAutosave, type AutosavePayload } from "./project-autosave";

export { readProjectAutosave } from "./project-autosave";

export function useProjectAutosave(enabled: boolean, payload: AutosavePayload) {
  const latestPayload = useRef(payload);
  const [state, setState] = useState<{ savedAt: string | null; error: string | null }>({ savedAt: null, error: null });

  useEffect(() => { latestPayload.current = payload; }, [payload]);

  useEffect(() => {
    if (!enabled) return;
    let writer: ReturnType<typeof createProjectAutosaveWriter> | undefined;
    const save = () => {
      try {
        writer ??= createProjectAutosaveWriter(window.localStorage);
        const next = writer.save(latestPayload.current);
        setState((current) => current.savedAt === next.savedAt && current.error === next.error ? current : next);
      } catch {
        setState((current) => ({ ...current, error: "自动存档失败，请检查浏览器存储权限并导出项目备份。" }));
      }
    };
    const initialStatus = window.setTimeout(() => {
      const snapshot = readProjectAutosave();
      if (snapshot) setState({ savedAt: snapshot.savedAt, error: null });
    }, 0);
    const interval = window.setInterval(save, autosaveIntervalMs);
    const visibility = () => { if (document.visibilityState === "hidden") save(); };
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.clearTimeout(initialStatus);
      window.clearInterval(interval);
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [enabled]);

  return state;
}
