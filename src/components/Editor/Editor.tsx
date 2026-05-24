import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import { useRef } from "react";
import { useExecution } from "../../hooks/useExecution";
import { useStore } from "../../store";
import type { Language } from "../../types";

function defineThemes(monaco: Parameters<OnMount>[1]) {
  monaco.editor.defineTheme("lexjs-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: { "editor.background": "#0d0d0d", "editor.lineHighlightBackground": "#1a1a1a" },
  });
  monaco.editor.defineTheme("lexjs-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: { "editor.background": "#fafafa" },
  });
}

interface Props {
  onRun: (code: string, lang: Language) => void;
}

export function Editor({ onRun }: Props) {
  const { code, language, setCode, settings } = useStore();
  const { scheduleAutoRun } = useExecution();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const theme = settings.theme === "dark" ? "lexjs-dark" : "lexjs-light";

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    defineThemes(monaco);
    monaco.editor.setTheme(theme);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
      onRun(editor.getValue(), language)
    );
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () =>
      onRun(editor.getValue(), language)
    );
  };

  const handleChange = (value: string | undefined) => {
    const next = value ?? "";
    setCode(next);
    scheduleAutoRun(next, language);
  };

  return (
    <div className="flex-1 h-full overflow-hidden">
      <MonacoEditor
        height="100%"
        language={language === "ts" ? "typescript" : "javascript"}
        value={code}
        theme={theme}
        onChange={handleChange}
        onMount={handleMount}
        options={{
          fontSize: settings.fontSize,
          fontFamily: "JetBrains Mono, Fira Code, monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: "on",
          wordWrap: "on",
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 12 },
          smoothScrolling: true,
          cursorBlinking: "smooth",
        }}
      />
    </div>
  );
}
