import { useCallback, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutoSave() {
  const [status, setStatus] = useState<SaveStatus>("idle");

  const run = useCallback(async (fn: () => Promise<void>) => {
    setStatus("saving");
    try {
      await fn();
      setStatus("saved");
      window.setTimeout(() => {
        setStatus(s => (s === "saved" ? "idle" : s));
      }, 1500);
    } catch (e) {
      console.error("Autosave failed:", e);
      setStatus("error");
    }
  }, []);

  return { status, run };
}

export function statusLabel(status: SaveStatus): string {
  switch (status) {
    case "saving": return "сохранение…";
    case "saved": return "сохранено";
    case "error": return "ошибка";
    default: return "";
  }
}
