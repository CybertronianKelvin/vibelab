import { useStore } from "../../store";
import type { Language } from "../../types";

interface Props { onRun: (code?: string, lang?: Language) => void }

const IconLayoutSide = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1" width="12" height="12" rx="1.5" />
    <line x1="7.5" y1="1" x2="7.5" y2="13" />
  </svg>
);

const IconLayoutBelow = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1" width="12" height="12" rx="1.5" />
    <line x1="1" y1="7.5" x2="13" y2="7.5" />
  </svg>
);

export function Toolbar({ onRun }: Props) {
  const {
    language, setLanguage, isRunning, settings,
    consoleLayout,
    toggleSidebar, togglePackages, toggleSettings, toggleConsoleLayout,
  } = useStore();

  return (
    <header className="flex items-center gap-2 px-4 py-2 border-b border-surface-600 bg-surface-800 shrink-0">
      <span className="text-base font-bold text-violet-400 mr-1 select-none">LexJS</span>

      <button
        onClick={toggleSidebar}
        className="px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-200 hover:bg-surface-600"
        title="Snippets (toggle sidebar)"
      >
        Snippets
      </button>

      <div className="flex rounded overflow-hidden border border-surface-600 text-xs">
        {(["js", "ts"] as Language[]).map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`px-3 py-1 font-mono font-semibold transition-colors ${
              language === lang
                ? "bg-violet-500 text-white"
                : "text-gray-400 hover:text-gray-200 hover:bg-surface-600"
            }`}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      <span className="text-xs text-gray-600">{settings.autoRun ? "auto" : "manual"}</span>

      <div className="flex-1" />

      <button
        onClick={toggleConsoleLayout}
        className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-surface-600 transition-colors"
        title={consoleLayout === "side" ? "Move console below editor" : "Move console to right side"}
      >
        {consoleLayout === "side" ? <IconLayoutBelow /> : <IconLayoutSide />}
      </button>

      <button
        onClick={() => onRun()}
        disabled={isRunning}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        title="Run (Cmd+R or Cmd+Enter)"
      >
        {isRunning ? "Running…" : "▶ Run"}
      </button>

      <button
        onClick={togglePackages}
        className="px-2 py-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-surface-600 text-sm"
        title="npm packages"
      >
        Packages
      </button>
      <button
        onClick={toggleSettings}
        className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-surface-600"
        title="Settings"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </header>
  );
}
