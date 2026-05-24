import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import { useRef, useState } from "react";
import { useExecution } from "../../hooks/useExecution";
import { tauriClient } from "../../lib/tauri";
import { useStore } from "../../store";
import type { Language } from "../../types";

let phpProvidersRegistered = false;
let _projectClasses: string[] = [];

export function setEditorProjectClasses(classes: string[]) {
  _projectClasses = classes;
}

function registerPhpProviders(monaco: Parameters<OnMount>[1]) {
  if (phpProvidersRegistered) return;
  phpProvidersRegistered = true;

  const K = monaco.languages.CompletionItemKind;

  const facades = [
    "Auth", "Cache", "Config", "Cookie", "Crypt", "DB", "Event", "File",
    "Gate", "Hash", "Http", "Log", "Mail", "Notification", "Queue",
    "Redirect", "Redis", "Request", "Response", "Route", "Schema",
    "Session", "Storage", "URL", "Validator", "View",
  ];

  const helpers = [
    ["abort", "abort($code, $message = '')"],
    ["app", "app($abstract = null)"],
    ["asset", "asset($path, $secure = null)"],
    ["auth", "auth($guard = null)"],
    ["back", "back($status = 302)"],
    ["bcrypt", "bcrypt($value)"],
    ["blank", "blank($value)"],
    ["broadcast", "broadcast($event = null)"],
    ["cache", "cache($key = null, $default = null)"],
    ["collect", "collect($value = null)"],
    ["config", "config($key = null, $default = null)"],
    ["cookie", "cookie($name = null, $value = null, $minutes = 0)"],
    ["csrf_field", "csrf_field()"],
    ["csrf_token", "csrf_token()"],
    ["dd", "dd(...$vars)"],
    ["dispatch", "dispatch($job)"],
    ["dump", "dump(...$vars)"],
    ["env", "env($key, $default = null)"],
    ["event", "event(...$args)"],
    ["filled", "filled($value)"],
    ["info", "info($message, $context = [])"],
    ["logger", "logger($message = null, $context = [])"],
    ["method_field", "method_field($method)"],
    ["now", "now($tz = null)"],
    ["old", "old($key = null, $default = null)"],
    ["optional", "optional($value = null)"],
    ["policy", "policy($class)"],
    ["redirect", "redirect($to = null, $status = 302)"],
    ["report", "report($exception)"],
    ["request", "request($key = null, $default = null)"],
    ["rescue", "rescue(callable $callback, $rescue = null)"],
    ["resolve", "resolve($name)"],
    ["response", "response($content = '', $status = 200, $headers = [])"],
    ["retry", "retry($times, callable $callback, $sleep = 0)"],
    ["route", "route($name, $parameters = [], $absolute = true)"],
    ["session", "session($key = null)"],
    ["tap", "tap($value, $callback = null)"],
    ["throw_if", "throw_if($condition, $exception, ...$parameters)"],
    ["throw_unless", "throw_unless($condition, $exception, ...$parameters)"],
    ["today", "today($tz = null)"],
    ["trans", "trans($key = null, $replace = [], $locale = null)"],
    ["url", "url($path = null, $parameters = [], $secure = null)"],
    ["validator", "validator($data = [], $rules = [])"],
    ["value", "value($value)"],
    ["view", "view($view = null, $data = [], $mergeData = [])"],
    ["with", "with($value, callable $callback = null)"],
    ["__", "__(string $key, array $replace = [], string $locale = null)"],
  ];

  const phpFunctions = [
    "array_chunk", "array_combine", "array_diff", "array_fill", "array_filter",
    "array_flip", "array_keys", "array_map", "array_merge", "array_pop",
    "array_push", "array_reverse", "array_search", "array_shift", "array_slice",
    "array_splice", "array_unique", "array_values", "base64_decode", "base64_encode",
    "count", "date", "explode", "file_get_contents", "file_put_contents",
    "floatval", "gettype", "implode", "in_array", "intval", "is_array",
    "is_null", "is_numeric", "is_string", "isset", "json_decode", "json_encode",
    "ltrim", "max", "min", "nl2br", "number_format", "ob_end_clean", "ob_start",
    "preg_match", "preg_replace", "print_r", "rand", "round", "rtrim",
    "sizeof", "sort", "sprintf", "str_contains", "str_ends_with", "str_pad",
    "str_repeat", "str_replace", "str_split", "str_starts_with", "strftime",
    "strip_tags", "strlen", "strpos", "strtolower", "strtoupper", "substr",
    "time", "trim", "unset", "var_dump", "var_export",
  ];

  monaco.languages.registerCompletionItemProvider("php", {
    triggerCharacters: ["\\", "$", ">", ":"],

    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const defaultRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Detect namespace prefix: e.g. "App\Mo" or "App\Models\"
      const textBefore = model
        .getLineContent(position.lineNumber)
        .substring(0, position.column - 1);
      const nsMatch = textBefore.match(/([A-Z][A-Za-z0-9_]*(?:\\[A-Za-z0-9_]*)*)$/);
      const nsPrefix = nsMatch ? nsMatch[1] : "";
      const nsRange = nsPrefix
        ? {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column - nsPrefix.length,
            endColumn: word.endColumn,
          }
        : null;

      const suggestions = [
        // Project classes (models, controllers, etc.) — namespace-aware
        ..._projectClasses
          .filter((cls) =>
            nsPrefix
              ? cls.toLowerCase().includes(nsPrefix.toLowerCase())
              : true
          )
          .map((cls) => {
            const shortName = cls.split("\\").pop() ?? cls;
            return {
              label: cls,
              kind: K.Class,
              insertText: cls,
              filterText: cls,
              detail: shortName,
              documentation: "Project class",
              range: nsRange ?? defaultRange,
              sortText: "0" + cls, // float project classes to top
            };
          }),

        ...facades.map((f) => ({
          label: f,
          kind: K.Class,
          insertText: f + "::",
          documentation: `Laravel ${f} facade`,
          range: defaultRange,
          sortText: "1" + f,
        })),
        ...helpers.map(([name, sig]) => ({
          label: name,
          kind: K.Function,
          insertText: name,
          detail: sig,
          documentation: `Laravel helper`,
          range: defaultRange,
          sortText: "2" + name,
        })),
        ...phpFunctions.map((f) => ({
          label: f,
          kind: K.Function,
          insertText: f,
          documentation: `PHP built-in`,
          range: defaultRange,
          sortText: "3" + f,
        })),
      ];

      return { suggestions };
    },
  });

  monaco.languages.registerDocumentFormattingEditProvider("php", {
    provideDocumentFormattingEdits: async (model) => {
      const code = model.getValue();
      const formatted = await tauriClient.formatPhp(code);
      return [{ range: model.getFullModelRange(), text: formatted }];
    },
  });
}

function defineThemes(monaco: Parameters<OnMount>[1]) {
  monaco.editor.defineTheme("vibelab-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#0d0d0d",
      "editor.lineHighlightBackground": "#1a1710",
      "editorCursor.foreground": "#f59e0b",
      "editor.selectionBackground": "#f59e0b30",
    },
  });
  monaco.editor.defineTheme("vibelab-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#fafaf8",
      "editorCursor.foreground": "#d97706",
      "editor.selectionBackground": "#f59e0b25",
    },
  });
}

interface Props {
  onRun: (code: string, lang: Language) => void;
}

const LANG_LABEL: Record<Language, string> = { js: "JavaScript", ts: "TypeScript", php: "PHP" };

export function Editor({ onRun }: Props) {
  const { code, language, setCode, setActiveSnippetId, clearOutput, settings } = useStore();
  const { scheduleAutoRun, cancelAutoRun } = useExecution();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const [formatting, setFormatting] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const theme = settings.theme === "dark" ? "vibelab-dark" : "vibelab-light";

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    defineThemes(monaco);
    registerPhpProviders(monaco);
    monaco.editor.setTheme(theme);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
      onRun(editor.getValue(), language)
    );
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR, () =>
      onRun(editor.getValue(), language)
    );
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
      () => editor.getAction("editor.action.formatDocument")?.run()
    );
    // Toggle find: addAction overrides Monaco's built-in Cmd+F keybinding
    editor.addAction({
      id: "vibelab.toggleFind",
      label: "Toggle Find",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
      run: () => {
        const widget = editor.getDomNode()?.querySelector(".find-widget");
        if (widget?.classList.contains("visible")) {
          editor.trigger("keyboard", "closeFindWidget", null);
          editor.focus();
        } else {
          editor.trigger("keyboard", "actions.find", null);
        }
      },
    });

    const domNode = editor.getDomNode();
    if (domNode) {
      // Capture-phase Escape so it fires before WebView swallows it
      domNode.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        const widget = domNode.querySelector(".find-widget");
        if (widget?.classList.contains("visible")) {
          e.stopPropagation();
          editor.trigger("keyboard", "closeFindWidget", null);
          editor.focus();
        }
      }, true);

      // Strip native OS tooltips from Monaco's find widget
      const stripTitles = () => {
        domNode.querySelectorAll(".find-widget [title]").forEach((el) => {
          el.removeAttribute("title");
        });
      };
      const observer = new MutationObserver(stripTitles);
      observer.observe(domNode, { childList: true, subtree: true, attributes: true, attributeFilter: ["title"] });
    }
  };

  const handleChange = (value: string | undefined) => {
    const next = value ?? "";
    setCode(next);
    scheduleAutoRun(next, language);
  };

  const handleClear = () => {
    cancelAutoRun();
    clearOutput();
    setCode("");
    setActiveSnippetId(null);
    setFormatError(null);
  };

  const handleCopy = async () => {
    if (!code.trim()) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleFormat = async () => {
    const editor = editorRef.current;
    if (!editor) return;
    setFormatting(true);
    setFormatError(null);
    try {
      await editor.getAction("editor.action.formatDocument")?.run();
    } catch (err) {
      setFormatError(String(err));
    } finally {
      setFormatting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-600 bg-surface-900 shrink-0">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {LANG_LABEL[language]}
        </span>
        <div className="flex items-center gap-3">
          {formatError && (
            <span className="text-xs text-red-400 max-w-[240px] truncate" title={formatError}>
              {formatError}
            </span>
          )}
          <button
            onClick={handleCopy}
            disabled={!code.trim()}
            className="text-xs text-gray-500 hover:text-gray-300 disabled:opacity-30"
            title="Copy all code"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleFormat}
            disabled={!code.trim() || formatting}
            className="text-xs text-gray-500 hover:text-gray-300 disabled:opacity-30"
            title="Format (Cmd+Shift+F)"
          >
            {formatting ? "Formatting…" : "Format"}
          </button>
          <button
            onClick={handleClear}
            disabled={!code.trim()}
            className="text-xs text-gray-500 hover:text-gray-300 disabled:opacity-30"
          >
            Clear
          </button>
        </div>
      </div>
      <MonacoEditor
        height="100%"
        language={language === "ts" ? "typescript" : language === "php" ? "php" : "javascript"}
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
          folding: true,
          foldingStrategy: "auto",
          showFoldingControls: "always",
        }}
      />
    </div>
  );
}
