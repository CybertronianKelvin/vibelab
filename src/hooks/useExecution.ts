import { useCallback, useEffect, useRef } from "react";
import { listenExecutionDone, listenExecutionOutput, tauriClient } from "../lib/tauri";
import { useStore } from "../store";
import type { Language } from "../types";

export function useExecution() {
  const { appendOutput, clearOutput, setIsRunning, settings } = useStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let unlistenOutput: (() => void) | null = null;
    let unlistenDone: (() => void) | null = null;

    (async () => {
      unlistenOutput = await listenExecutionOutput((line) => appendOutput(line));
      unlistenDone = await listenExecutionDone(() => setIsRunning(false));
    })();

    return () => {
      unlistenOutput?.();
      unlistenDone?.();
    };
  }, [appendOutput, setIsRunning]);

  const run = useCallback(
    async (code: string, language: Language) => {
      clearOutput();
      setIsRunning(true);
      try {
        await tauriClient.executeCode(code, language);
      } catch (err) {
        appendOutput({ output_type: "stderr", content: String(err), timestamp: Date.now() });
        setIsRunning(false);
      }
    },
    [clearOutput, setIsRunning, appendOutput]
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
