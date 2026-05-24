import { useStore } from "../../store";
import type { Language } from "../../types";

interface Props { onRun: (code?: string, lang?: Language) => void }

export function Toolbar({ onRun }: Props) {
  const { language, setLanguage, isRunning, settings,
          toggleSidebar, togglePackages, toggleSettings, togglePreview } = useStore();

  return (
    <header className="flex items-center gap-3 px-4 py-2 border-b border-surface-600 bg-surface-800 shrink-0">
      <span className="text-lg font-bold text-blue-400 mr-1">LexJS</span>
      <button onClick={toggleSidebar} className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-surface-600" title="Snippets">Snippets</button>

      <div className="flex rounded overflow-hidden border border-surface-500 text-xs">
        {(["js", "ts"] as Language[]).map((lang) => (
          <button key={lang} onClick={() => setLanguage(lang)}
            className={`px-3 py-1 font-mono font-semibold transition-colors ${language === lang ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-surface-600"}`}>
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      <span className="text-xs text-gray-600">{settings.autoRun ? "auto" : "manual"}</span>
      <div className="flex-1" />

      <button onClick={() => onRun()} disabled={isRunning}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium"
        title="Run (Cmd+R or Cmd+Enter)">
        {isRunning ? "Running..." : "Run"}
      </button>

      <button onClick={togglePreview} className="px-2 py-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-surface-600 text-sm" title="Preview panel">Preview</button>
      <button onClick={togglePackages} className="px-2 py-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-surface-600 text-sm" title="npm packages">Packages</button>
      <button onClick={toggleSettings} className="px-2 py-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-surface-600" title="Settings">Settings</button>
    </header>
  );
}
