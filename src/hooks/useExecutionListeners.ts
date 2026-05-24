import { useEffect } from "react";
import { listenExecutionDone, listenExecutionOutput } from "../lib/tauri";
import { useStore } from "../store";

export function useExecutionListeners() {
  const appendOutput = useStore((s) => s.appendOutput);
  const setIsRunning = useStore((s) => s.setIsRunning);

  useEffect(() => {
    let cancelled = false;
    let unlistenOutput: (() => void) | null = null;
    let unlistenDone: (() => void) | null = null;

    (async () => {
      const out = await listenExecutionOutput((line) => {
        if (!cancelled) appendOutput(line);
      });
      const done = await listenExecutionDone(() => {
        if (!cancelled) setIsRunning(false);
      });

      if (cancelled) {
        out();
        done();
      } else {
        unlistenOutput = out;
        unlistenDone = done;
      }
    })();

    return () => {
      cancelled = true;
      unlistenOutput?.();
      unlistenDone?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
