import { useCallback, useEffect, useState } from "react";
import { Console } from "./components/Console/Console";
import { Editor } from "./components/Editor/Editor";
import { PackageManager } from "./components/PackageManager/PackageManager";
import { Preview } from "./components/Preview/Preview";
import { ResizeHandle } from "./components/ResizeHandle/ResizeHandle";
import { SettingsPanel } from "./components/Settings/Settings";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { Toolbar } from "./components/Toolbar/Toolbar";
import { useExecution } from "./hooks/useExecution";
import { useExecutionListeners } from "./hooks/useExecutionListeners";
import { useSettings } from "./hooks/useSettings";
import { useSnippets } from "./hooks/useSnippets";
import { useStore } from "./store";
import type { Language } from "./types";

const CONSOLE_MIN_PCT = 15;
const CONSOLE_MAX_PCT = 75;
const EDITOR_MIN_PCT = 25;

export default function App() {
  const {
    code, language,
    sidebarOpen, packagesOpen, settingsOpen, previewOpen, consoleLayout,
    clearOutput,
  } = useStore();
  const { run } = useExecution();
  const { loadSnippets } = useSnippets();
  const { loadSettings, settings } = useSettings();

  useExecutionListeners();

  // console width % (side layout) / console height % (below layout)
  const [consolePct, setConsolePct] = useState(42);

  useEffect(() => {
    loadSettings();
    loadSnippets();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        clearOutput();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clearOutput]);

  const handleRun = useCallback(
    (codeArg?: string, langArg?: Language) => run(codeArg ?? code, langArg ?? language),
    [run, code, language]
  );

  const handleHorizontalResize = useCallback((delta: number) => {
    setConsolePct((prev) => {
      const containerWidth = document.documentElement.clientWidth;
      const deltaPct = (delta / containerWidth) * 100;
      return Math.min(CONSOLE_MAX_PCT, Math.max(CONSOLE_MIN_PCT, prev - deltaPct));
    });
  }, []);

  const handleVerticalResize = useCallback((delta: number) => {
    setConsolePct((prev) => {
      const containerHeight = document.documentElement.clientHeight;
      const deltaPct = (delta / containerHeight) * 100;
      // Negative: dragging handle DOWN pushes boundary down → editor grows, console shrinks
      return Math.min(CONSOLE_MAX_PCT, Math.max(CONSOLE_MIN_PCT, prev - deltaPct));
    });
  }, []);

  const editorPct = 100 - consolePct;

  return (
    <div className="flex flex-col h-screen dark:bg-surface-900 bg-gray-50 dark:text-gray-100 text-gray-900">
      <Toolbar onRun={handleRun} />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {sidebarOpen && <Sidebar />}

        {consoleLayout === "side" ? (
          <>
            <div className="overflow-hidden min-w-0" style={{ flex: `${100 - consolePct} 1 0%` }}>
              <Editor onRun={handleRun} />
            </div>

            <ResizeHandle direction="horizontal" onResize={handleHorizontalResize} />

            <div className="overflow-hidden" style={{ flex: `${consolePct} 1 0%`, minWidth: `${CONSOLE_MIN_PCT}%` }}>
              <Console />
            </div>

            {previewOpen && (
              <>
                <ResizeHandle direction="horizontal" onResize={(d) => handleHorizontalResize(-d)} />
                <div className="w-[30%] overflow-hidden shrink-0">
                  <Preview />
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden min-w-0">
            <div className="overflow-hidden" style={{ flex: `${editorPct} 1 0%`, minHeight: `${EDITOR_MIN_PCT}%` }}>
              <Editor onRun={handleRun} />
            </div>

            <ResizeHandle direction="vertical" onResize={handleVerticalResize} />

            <div className="overflow-hidden" style={{ flex: `${consolePct} 1 0%`, minHeight: `${CONSOLE_MIN_PCT}%` }}>
              <Console />
            </div>

            {previewOpen && (
              <>
                <ResizeHandle direction="vertical" onResize={(d) => handleVerticalResize(-d)} />
                <div className="overflow-hidden shrink-0 h-1/3">
                  <Preview />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {packagesOpen && <PackageManager />}
      {settingsOpen && <SettingsPanel />}
    </div>
  );
}
