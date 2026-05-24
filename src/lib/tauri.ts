import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  AiMessage,
  AiProvider,
  ExecutionDone,
  ExecutionLine,
  HistoryEntry,
  Language,
  Package,
  Settings,
  Snippet,
} from "../types";

export interface AiToken {
  text: string;
  done: boolean;
  error: string | null;
}

export const tauriClient = {
  executeCode: (
    code: string,
    language: Language,
    nodePath?: string | null,
    phpPath?: string | null,
    projectPath?: string | null,
  ): Promise<void> =>
    invoke("execute_code", {
      code,
      language,
      nodePath: nodePath ?? null,
      phpPath: phpPath ?? null,
      projectPath: projectPath ?? null,
    }),

  installPackage: (name: string): Promise<string> =>
    invoke("install_package", { name }),

  removePackage: (name: string): Promise<string> =>
    invoke("remove_package", { name }),

  listPackages: (): Promise<Package[]> => invoke("list_packages"),

  getSnippets: (): Promise<Snippet[]> => invoke("get_snippets"),

  saveSnippet: (snippet: Snippet): Promise<Snippet> =>
    invoke("save_snippet", { snippet }),

  deleteSnippet: (id: string): Promise<void> =>
    invoke("delete_snippet", { id }),

  getHistory: (limit: number): Promise<HistoryEntry[]> =>
    invoke("get_history", { limit }),

  saveHistoryEntry: (entry: HistoryEntry, limit: number): Promise<HistoryEntry> =>
    invoke("save_history_entry", { entry, limit }),

  clearHistory: (): Promise<void> => invoke("clear_history"),

  formatPhp: (code: string): Promise<string> => invoke("format_php", { code }),

  getSettings: (): Promise<Settings> => invoke("get_settings"),

  saveSettings: (settings: Settings): Promise<void> =>
    invoke("save_settings", { settings }),

  getProjectClasses: (projectPath: string): Promise<string[]> =>
    invoke("get_project_classes", { projectPath }),

  aiComplete: (
    messages: Pick<AiMessage, "role" | "content">[],
    provider: AiProvider,
    apiKey: string,
    model: string,
    language: string,
    projectType?: string | null,
    codeContext?: string | null,
  ): Promise<void> =>
    invoke("ai_complete", { messages, provider, apiKey, model, language, projectType: projectType ?? null, codeContext: codeContext ?? null }),

  selectDirectory: async (): Promise<string | null> => {
    const result = await open({ directory: true, multiple: false, title: "Select Project Directory" });
    return typeof result === "string" ? result : null;
  },
};

export const listenAiToken = (
  cb: (token: AiToken) => void
): Promise<UnlistenFn> =>
  listen<AiToken>("ai-token", (e) => cb(e.payload));

export const listenExecutionOutput = (
  cb: (line: ExecutionLine) => void
): Promise<UnlistenFn> =>
  listen<ExecutionLine>("execution-output", (e) => cb(e.payload));

export const listenExecutionDone = (
  cb: (done: ExecutionDone) => void
): Promise<UnlistenFn> =>
  listen<ExecutionDone>("execution-done", (e) => cb(e.payload));
