import { useCallback } from "react";
import { tauriClient } from "../lib/tauri";
import { useStore } from "../store";

export function useHistory() {
  const { settings, setHistory } = useStore();

  const loadHistory = useCallback(async () => {
    const entries = await tauriClient.getHistory(settings.historyLimit);
    setHistory(entries);
  }, [settings.historyLimit, setHistory]);

  const clearHistory = useCallback(async () => {
    await tauriClient.clearHistory();
    setHistory([]);
  }, [setHistory]);

  return { loadHistory, clearHistory };
}
