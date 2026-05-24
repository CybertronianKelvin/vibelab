import { useEffect, useRef, useState } from "react";
import { useStore } from "../../store";
import type { ExecutionLine } from "../../types";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const re = new RegExp(`(${escapeRegex(query)})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark key={i} className="bg-yellow-400/40 text-yellow-100 rounded-sm not-italic">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function Line({ line, searchQuery }: { line: ExecutionLine; searchQuery: string }) {
  const colors = { stdout: "text-gray-200", stderr: "text-red-400", info: "text-brand-400" };
  const prefix = { stdout: "", stderr: "✖ ", info: "ℹ " };
  return (
    <div className={`font-mono text-sm leading-relaxed px-4 py-0.5 whitespace-pre-wrap break-words ${colors[line.output_type]}`}>
      <span className="opacity-40 text-xs">{prefix[line.output_type]}</span>
      {highlightText(line.content, searchQuery)}
    </div>
  );
}

export function Console() {
  const { outputLines, isRunning, clearOutput } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!outputLines.length) return;
    const text = outputLines.map((l) => l.content).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [outputLines]);

  useEffect(() => {
    if (showSearch) {
      searchRef.current?.focus();
      searchRef.current?.select();
    } else {
      setSearch("");
    }
  }, [showSearch]);

  // Cmd/Ctrl+F when Monaco doesn't have focus → show console search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "f") return;
      // Monaco marks its container with .focused when the editor has keyboard focus
      if (document.querySelector(".monaco-editor.focused")) return;
      e.preventDefault();
      setShowSearch((v) => !v);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Menu item "Find in Console" dispatched by useMenuListener
  useEffect(() => {
    const handler = () => setShowSearch((v) => !v);
    window.addEventListener("vibelab:find-console", handler);
    return () => window.removeEventListener("vibelab:find-console", handler);
  }, []);

  const matchCount = search.trim()
    ? outputLines.reduce(
        (n, l) =>
          n + (l.content.toLowerCase().split(search.toLowerCase()).length - 1),
        0
      )
    : 0;

  const filtered = search.trim()
    ? outputLines.filter((l) =>
        l.content.toLowerCase().includes(search.toLowerCase())
      )
    : outputLines;

  return (
    <div className="relative flex flex-col h-full bg-surface-900">
      {/* Floating find bar — VS Code style */}
      {showSearch && (
        <div className="absolute top-9 right-3 z-20 flex items-center gap-2 bg-[#2d2d2d] border border-surface-500 rounded shadow-xl px-3 py-1.5">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" className="text-gray-400 shrink-0">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398l3.85 3.85a1 1 0 0 0 1.415-1.415l-3.868-3.833zm-5.242 1.156a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/>
          </svg>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setShowSearch(false)}
            placeholder="Find"
            className="w-44 bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
          />
          <span className="text-xs text-gray-500 min-w-[2.5rem] text-right tabular-nums">
            {search.trim() ? `${matchCount} match${matchCount !== 1 ? "es" : ""}` : "0/0"}
          </span>
          <button
            onClick={() => setShowSearch(false)}
            className="text-gray-500 hover:text-gray-300 ml-1"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-600 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Output</span>
          {isRunning && <span className="text-xs text-brand-400 animate-pulse">● Running</span>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            disabled={!outputLines.length}
            className="text-xs text-gray-500 hover:text-gray-300 disabled:opacity-30"
            title="Copy all output"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={() => setShowSearch((v) => !v)}
            className={`text-xs transition-colors ${showSearch ? "text-amber-400" : "text-gray-500 hover:text-gray-300"}`}
          >
            Find
          </button>
          <button onClick={clearOutput} className="text-xs text-gray-500 hover:text-gray-300">Clear</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {filtered.length === 0 && outputLines.length === 0 ? (
          <div className="text-gray-600 text-sm font-mono px-4 py-3 italic">
            Run some code to see output…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-600 text-sm font-mono px-4 py-3 italic">
            No output matches "{search}"
          </div>
        ) : (
          filtered.map((line, i) => (
            <Line key={`${line.timestamp}-${i}`} line={line} searchQuery={search} />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
