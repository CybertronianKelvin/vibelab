import { useCallback, useRef } from "react";
import { tauriClient } from "../lib/tauri";
import { useStore } from "../store";
import type { Language } from "../types";

export function useExecution() {
  const { appendOutput, clearOutput, setIsRunning, settings, project } = useStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(
    async (code: string, language: Language) => {
      clearOutput();
      setIsRunning(true);
      try {
        await tauriClient.executeCode(code, language, settings.nodePath, settings.phpPath, project?.path ?? null);
      } catch (err) {
        appendOutput({ output_type: "stderr", content: String(err), timestamp: Date.now() });
        setIsRunning(false);
      }
    },
    [clearOutput, setIsRunning, appendOutput, settings.nodePath, settings.phpPath, project]
  );

  const scheduleAutoRun = useCallback(
    (code: string, language: Language) => {
      if (!settings.autoRun) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => run(code, language), settings.autoRunDelay);
    },
    [run, settings.autoRun, settings.autoRunDelay]
  );

  return { run, scheduleAutoRun };
}
