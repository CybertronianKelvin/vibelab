import { create } from "zustand";
import type { ExecutionLine, Language, Package, Settings, Snippet } from "../types";

const DEFAULT_CODE = '// Welcome to LexJS\nconsole.log("Hello, World!");\n';

const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  fontSize: 14,
  autoRun: true,
  autoRunDelay: 500,
  envVars: {},
  nodePath: null,
};

interface AppState {
  code: string;
  language: Language;
  setCode: (code: string) => void;
  setLanguage: (lang: Language) => void;

  isRunning: boolean;
  outputLines: ExecutionLine[];
  setIsRunning: (v: boolean) => void;
  appendOutput: (line: ExecutionLine) => void;
  clearOutput: () => void;

  snippets: Snippet[];
  setSnippets: (s: Snippet[]) => void;
  upsertSnippet: (s: Snippet) => void;
  removeSnippet: (id: string) => void;

  packages: Package[];
  setPackages: (p: Package[]) => void;

  settings: Settings;
  setSettings: (s: Settings) => void;

  sidebarOpen: boolean;
  packagesOpen: boolean;
  settingsOpen: boolean;
  consoleLayout: "side" | "below";
  toggleSidebar: () => void;
  togglePackages: () => void;
  toggleSettings: () => void;
  toggleConsoleLayout: () => void;
}

export const useStore = create<AppState>((set) => ({
  code: DEFAULT_CODE,
  language: "js",
  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),

  isRunning: false,
  outputLines: [],
  setIsRunning: (isRunning) => set({ isRunning }),
  appendOutput: (line) => set((s) => ({ outputLines: [...s.outputLines, line] })),
  clearOutput: () => set({ outputLines: [] }),

  snippets: [],
  setSnippets: (snippets) => set({ snippets }),
  upsertSnippet: (snippet) =>
    set((s) => ({
      snippets: s.snippets.some((x) => x.id === snippet.id)
        ? s.snippets.map((x) => (x.id === snippet.id ? snippet : x))
        : [snippet, ...s.snippets],
    })),
  removeSnippet: (id) =>
    set((s) => ({ snippets: s.snippets.filter((x) => x.id !== id) })),

  packages: [],
  setPackages: (packages) => set({ packages }),

  settings: DEFAULT_SETTINGS,
  setSettings: (settings) => set({ settings }),

  sidebarOpen: true,
  packagesOpen: false,
  settingsOpen: false,
  consoleLayout: "side",
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  togglePackages: () => set((s) => ({ packagesOpen: !s.packagesOpen })),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  toggleConsoleLayout: () =>
    set((s) => ({ consoleLayout: s.consoleLayout === "side" ? "below" : "side" })),
}));
