import { useCallback, useRef } from "react";
import { tauriClient } from "../lib/tauri";
import { useStore } from "../store";
import type { Language } from "../types";

export function useExecution() {
  const { appendOutput, setIsRunning, settings, project, prependHistory } = useStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const execute = useCallback(
    async (code: string, language: Language) => {
      appendOutput({ output_type: "separator", content: language, timestamp: Date.now() });
      setIsRunning(true);
      try {
        await tauriClient.executeCode(code, language, settings.nodePath, settings.phpPath, project?.path ?? null);
      } catch (err) {
        appendOutput({ output_type: "stderr", content: String(err), timestamp: Date.now() });
        setIsRunning(false);
      }
    },
    [appendOutput, setIsRunning, settings.nodePath, settings.phpPath, project]
  );

  const run = useCallback(
    async (code: string, language: Language) => {
      if (code.trim()) {
        tauriClient
          .saveHistoryEntry(
            { id: "", code, language, ranAt: "", projectPath: project?.path ?? null, projectType: project?.type ?? null },
            settings.historyLimit,
          )
          .then((entry) => prependHistory(entry))
          .catch(() => {});
      }
      await execute(code, language);
    },
    [execute, prependHistory, settings.historyLimit]
  );

  const cancelAutoRun = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const scheduleAutoRun = useCallback(
    (code: string, language: Language) => {
      if (!settings.autoRun) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => execute(code, language), settings.autoRunDelay);
    },
    [execute, settings.autoRun, settings.autoRunDelay]
  );

  return { run, scheduleAutoRun, cancelAutoRun };
}
