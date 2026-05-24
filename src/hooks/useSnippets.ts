import { useCallback } from "react";
import { tauriClient } from "../lib/tauri";
import { useStore } from "../store";
import type { Snippet } from "../types";

export function useSnippets() {
  const { setSnippets, upsertSnippet, removeSnippet } = useStore();

  const loadSnippets = useCallback(async () => {
    const snippets = await tauriClient.getSnippets();
    setSnippets(snippets);
  }, [setSnippets]);

  const saveSnippet = useCallback(
    async (snippet: Snippet) => {
      const saved = await tauriClient.saveSnippet(snippet);
      upsertSnippet(saved);
      return saved;
    },
    [upsertSnippet]
  );

  const deleteSnippet = useCallback(
    async (id: string) => {
      await tauriClient.deleteSnippet(id);
      removeSnippet(id);
    },
    [removeSnippet]
  );

  return { loadSnippets, saveSnippet, deleteSnippet };
}
