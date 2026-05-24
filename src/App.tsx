import { useCallback, useEffect } from "react";
import { Console } from "./components/Console/Console";
import { Editor } from "./components/Editor/Editor";
import { PackageManager } from "./components/PackageManager/PackageManager";
import { Preview } from "./components/Preview/Preview";
import { SettingsPanel } from "./components/Settings/Settings";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { Toolbar } from "./components/Toolbar/Toolbar";
import { useExecution } from "./hooks/useExecution";
import { useSettings } from "./hooks/useSettings";
import { useSnippets } from "./hooks/useSnippets";
import { useStore } from "./store";
import type { Language } from "./types";

export default function App() {
  const { code, language, sidebarOpen, packagesOpen, settingsOpen, previewOpen, clearOutput } =
    useStore();
  const { run } = useExecution();
  const { loadSnippets } = useSnippets();
  const { loadSettings, settings } = useSettings();

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

  return (
    <div className="flex flex-col h-screen dark:bg-surface-900 bg-gray-50 dark:text-gray-100 text-gray-900">
      <Toolbar onRun={handleRun} />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar />}

        <div className="flex-1 overflow-hidden">
          <Editor onRun={handleRun} />
        </div>

        <div className="w-px dark:bg-surface-600 bg-gray-200 shrink-0" />

        <div className="w-[45%] overflow-hidden">
          <Console />
        </div>

        {previewOpen && (
          <div className="w-[35%] overflow-hidden">
            <Preview />
          </div>
        )}
      </div>

      {packagesOpen && <PackageManager />}
      {settingsOpen && <SettingsPanel />}
    </div>
  );
}
