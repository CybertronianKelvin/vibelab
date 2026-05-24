import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  ExecutionDone,
  ExecutionLine,
  Language,
  Package,
  Settings,
  Snippet,
} from "../types";

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

  getSettings: (): Promise<Settings> => invoke("get_settings"),

  saveSettings: (settings: Settings): Promise<void> =>
    invoke("save_settings", { settings }),

  selectDirectory: async (): Promise<string | null> => {
    const result = await open({ directory: true, multiple: false, title: "Select Project Directory" });
    return typeof result === "string" ? result : null;
  },
};

export const listenExecutionOutput = (
  cb: (line: ExecutionLine) => void
): Promise<UnlistenFn> =>
  listen<ExecutionLine>("execution-output", (e) => cb(e.payload));

export const listenExecutionDone = (
  cb: (done: ExecutionDone) => void
): Promise<UnlistenFn> =>
  listen<ExecutionDone>("execution-done", (e) => cb(e.payload));
