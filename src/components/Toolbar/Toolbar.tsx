import { useEffect } from "react";
import { useStore } from "../../store";
import { tauriClient } from "../../lib/tauri";
import { setEditorProjectClasses } from "../Editor/Editor";
import { useExecution } from "../../hooks/useExecution";
import { useSettings } from "../../hooks/useSettings";
import type { Language, ProjectType } from "../../types";

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

const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  laravel: "Laravel",
  node: "Node",
  php: "PHP",
  unknown: "Project",
};

function projectBadge(type: ProjectType) {
  if (type === "laravel") return "bg-red-900/50 text-red-300";
  if (type === "node") return "bg-green-900/50 text-green-300";
  if (type === "php") return "bg-blue-900/50 text-blue-300";
  return "bg-surface-600 text-gray-400";
}

export function Toolbar({ onRun }: Props) {
  const {
    language, setLanguage, isRunning, settings, code,
    consoleLayout, project, setProject, clearOutput, aiChatOpen,
    toggleSidebar, togglePackages, toggleSettings, toggleConsoleLayout, toggleSnippetModal, toggleAiChat,
    activeSnippetId, setActiveSnippetId, setCode,
  } = useStore();
  const { updateSettings } = useSettings();
  const { cancelAutoRun } = useExecution();

  useEffect(() => {
    const onLink = () => { handleLinkProject().catch(() => {}); };
    const onUnlink = () => {
      setProject(null);
      updateSettings({ projectPath: null, projectType: null });
      setEditorProjectClasses([]);
    };
    window.addEventListener("vibelab:link-project", onLink);
    window.addEventListener("vibelab:unlink-project", onUnlink);
    return () => {
      window.removeEventListener("vibelab:link-project", onLink);
      window.removeEventListener("vibelab:unlink-project", onUnlink);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLanguageSwitch = (lang: Language) => {
    if (lang === language) return;
    cancelAutoRun();
    clearOutput();
    if (activeSnippetId) {
      setCode("");
      setActiveSnippetId(null);
    }
    setLanguage(lang);
  };

  const handleLinkProject = async () => {
    const path = await tauriClient.selectDirectory();
    if (!path) return;
    const type = await detectProjectType(path);
    setProject({ path, type });
    updateSettings({ projectPath: path, projectType: type });
    if (type === "laravel" || type === "php") {
      tauriClient.getProjectClasses(path)
        .then((classes) => setEditorProjectClasses(classes))
        .catch(() => {});
    }
  };

  const handleUnlinkProject = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProject(null);
    updateSettings({ projectPath: null, projectType: null });
    setEditorProjectClasses([]);
  };

  const projectName = project ? project.path.split("/").pop() ?? project.path : null;

  return (
    <header className="flex items-center gap-2 px-4 py-2 border-b border-surface-600 bg-surface-800 shrink-0">
      <span className="text-base font-bold text-brand-500 mr-1 select-none">VibeLab</span>

      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-surface-600 transition-colors"
        title="Library (Snippets & History)"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="1" width="13" height="13" rx="1.5" />
          <line x1="5" y1="1" x2="5" y2="14" />
        </svg>
      </button>

      <button
        onClick={toggleSnippetModal}
        disabled={!code.trim()}
        className="px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-200 hover:bg-surface-600 disabled:opacity-40"
        title="Save current code as snippet"
      >
        + Snippet
      </button>

      <div className="flex rounded overflow-hidden border border-surface-600 text-xs">
        {(["js", "ts", "php"] as Language[]).map((lang) => (
          <button
            key={lang}
            onClick={() => handleLanguageSwitch(lang)}
            className={`px-3 py-1 font-mono font-semibold transition-colors ${
              language === lang
                ? "bg-brand-500 text-white"
                : "text-gray-400 hover:text-gray-200 hover:bg-surface-600"
            }`}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      <span className="text-xs text-gray-600">{settings.autoRun ? "auto" : "manual"}</span>

      {/* Project linker */}
      {project ? (
        <div className="flex items-center gap-1.5">
          <span className={`text-xs px-2 py-0.5 rounded font-mono ${projectBadge(project.type)}`}>
            {PROJECT_TYPE_LABEL[project.type]}
          </span>
          <span className="text-xs text-gray-300 max-w-[120px] truncate" title={project.path}>
            {projectName}
          </span>
          <button
            onClick={handleUnlinkProject}
            className="text-gray-500 hover:text-red-400 text-xs"
            title="Unlink project"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          onClick={handleLinkProject}
          className="px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-200 hover:bg-surface-600"
          title="Link a project folder (Node, Laravel, PHP)"
        >
          Link Project
        </button>
      )}

      <div className="flex-1" />

      <button
        onClick={toggleAiChat}
        className={`p-1.5 rounded transition-colors ${
          aiChatOpen
            ? "text-brand-500 bg-brand-900/30 hover:bg-brand-900/50"
            : "text-gray-400 hover:text-gray-200 hover:bg-surface-600"
        }`}
        title="Toggle AI Chat"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M13 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h3l2 2 2-2h4a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
        </svg>
      </button>

      <button
        onClick={toggleConsoleLayout}
        className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-surface-600 transition-colors"
        title={consoleLayout === "side" ? "Move output below editor" : "Move output to right side"}
      >
        {consoleLayout === "side" ? <IconLayoutBelow /> : <IconLayoutSide />}
      </button>

      <button
        onClick={() => onRun()}
        disabled={isRunning}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
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

async function detectProjectType(path: string): Promise<import("../../types").ProjectType> {
  const { exists } = await import("@tauri-apps/plugin-fs");
  const artisan = await exists(path + "/artisan").catch(() => false);
  if (artisan) return "laravel";
  const pkgJson = await exists(path + "/package.json").catch(() => false);
  if (pkgJson) return "node";
  const composerJson = await exists(path + "/composer.json").catch(() => false);
  if (composerJson) return "php";
  return "unknown";
}
