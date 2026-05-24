import { useEffect, useRef, useCallback } from "react";
import { listenAiToken, tauriClient } from "../lib/tauri";
import { useStore } from "../store";
import type { AiMessage, AiProvider } from "../types";

async function readProjectDeps(projectPath: string): Promise<string | null> {
  try {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const parts: string[] = [];

    // Node / JS / TS project
    try {
      const raw = await readTextFile(`${projectPath}/package.json`);
      const pkg = JSON.parse(raw);
      const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
      if (deps.length) parts.push(`Available npm packages: ${deps.join(", ")}`);
    } catch { /* no package.json */ }

    // PHP / Laravel project
    try {
      const raw = await readTextFile(`${projectPath}/composer.json`);
      const pkg = JSON.parse(raw);
      const deps = Object.keys({ ...pkg.require, ...pkg["require-dev"] });
      if (deps.length) parts.push(`Available Composer packages: ${deps.join(", ")}`);
    } catch { /* no composer.json */ }

    return parts.length ? parts.join("\n") : null;
  } catch {
    return null;
  }
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useAiChat() {
  const {
    aiMessages, appendAiMessage, appendAiToken, setAiStreaming, setAiMessages,
    settings, language, project, code,
  } = useStore();

  const streamingIdRef = useRef<string | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    listenAiToken((token) => {
      if (cancelled) return;
      if (token.error) {
        setAiStreaming(false);
        if (streamingIdRef.current) {
          appendAiToken(streamingIdRef.current, `\n\n⚠️ ${token.error}`);
          streamingIdRef.current = null;
        }
        return;
      }
      if (token.done) {
        setAiStreaming(false);
        streamingIdRef.current = null;
        return;
      }
      if (streamingIdRef.current) {
        appendAiToken(streamingIdRef.current, token.text);
      }
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback(async (userText: string) => {
    if (!settings.aiProvider || !settings.aiApiKey || !settings.aiModel) return;
    if (!userText.trim()) return;

    const userMsg: AiMessage = {
      id: makeId(),
      role: "user",
      content: userText.trim(),
      timestamp: Date.now(),
    };
    appendAiMessage(userMsg);

    const assistantId = makeId();
    appendAiMessage({ id: assistantId, role: "assistant", content: "", timestamp: Date.now() });
    streamingIdRef.current = assistantId;
    setAiStreaming(true);

    const history = [...aiMessages, userMsg].map((m) => ({ role: m.role, content: m.content }));

    const contextParts: string[] = [];
    if (code.trim()) contextParts.push(code.trim());
    if (project?.path) {
      const pkgInfo = await readProjectDeps(project.path);
      if (pkgInfo) contextParts.push(pkgInfo);
    }

    try {
      await tauriClient.aiComplete(
        history,
        settings.aiProvider as AiProvider,
        settings.aiApiKey,
        settings.aiModel,
        language,
        project?.type ?? null,
        contextParts.length ? contextParts.join("\n\n") : null,
      );
    } catch (err) {
      appendAiToken(assistantId, `\n\n⚠️ ${String(err)}`);
      setAiStreaming(false);
      streamingIdRef.current = null;
    }
  }, [aiMessages, appendAiMessage, appendAiToken, setAiStreaming, settings, language, project, code]);

  const clearChat = useCallback(() => setAiMessages([]), [setAiMessages]);

  return { send, clearChat };
}
