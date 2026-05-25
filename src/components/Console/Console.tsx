import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// ── Output colorizer ─────────────────────────────────────────────────────────

const ANSI_FG: Record<number, string> = {
  30: "#6b7280", 31: "#f87171", 32: "#4ade80", 33: "#fbbf24",
  34: "#60a5fa", 35: "#c084fc", 36: "#34d399", 37: "#d1d5db",
  90: "#9ca3af", 91: "#fca5a5", 92: "#86efac", 93: "#fde68a",
  94: "#93c5fd", 95: "#d8b4fe", 96: "#6ee7b7", 97: "#f9fafb",
};

interface Segment { text: string; color?: string; bold?: boolean }

function parseAnsi(text: string): Segment[] {
  const segments: Segment[] = [];
  const parts = text.split(/(\x1b\[[0-9;]*m)/g);
  let color: string | undefined;
  let bold = false;
  for (const part of parts) {
    if (part.startsWith("\x1b[")) {
      const codes = part.slice(2, -1).split(";").map(Number);
      for (const c of codes) {
        if (c === 0) { color = undefined; bold = false; }
        else if (c === 1) bold = true;
        else if (ANSI_FG[c]) color = ANSI_FG[c];
      }
    } else if (part) {
      segments.push({ text: part, color, bold });
    }
  }
  return segments;
}

function tokenizeOutput(text: string): Segment[] {
  const segments: Segment[] = [];
  const re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b(?:true|false|TRUE|FALSE)\b|\b(?:null|NULL|undefined|NaN|Infinity)\b|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index) });
    const v = m[1];
    let color = "#60a5fa";
    if (v[0] === '"' || v[0] === "'") color = "#86efac";
    else if (/^(?:true|TRUE)$/.test(v)) color = "#4ade80";
    else if (/^(?:false|FALSE|null|NULL|undefined|NaN)$/.test(v)) color = "#f87171";
    segments.push({ text: v, color });
    last = m.index + v.length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}

function renderSegments(segments: Segment[], query: string): React.ReactNode {
  return segments.map((seg, i) => (
    <span key={i} style={{ color: seg.color, fontWeight: seg.bold ? "bold" : undefined }}>
      {highlightText(seg.text, query)}
    </span>
  ));
}

function Line({ line, searchQuery, fontSize }: { line: ExecutionLine; searchQuery: string; fontSize: number }) {
  const wrapperColors = { stdout: "text-gray-200", stderr: "text-red-400", info: "text-brand-400", separator: "" };
  const prefix = { stdout: "", stderr: "✖ ", info: "ℹ ", separator: "" };

  let content: React.ReactNode;
  if (line.output_type === "stdout") {
    const hasAnsi = /\x1b\[/.test(line.content);
    const segments = hasAnsi ? parseAnsi(line.content) : tokenizeOutput(line.content);
    content = renderSegments(segments, searchQuery);
  } else {
    content = highlightText(line.content, searchQuery);
  }

  return (
    <div
      className={`font-mono leading-relaxed px-4 py-0.5 whitespace-pre-wrap break-words ${wrapperColors[line.output_type]}`}
      style={{ fontSize }}
    >
      <span className="opacity-40" style={{ fontSize: fontSize - 2 }}>{prefix[line.output_type]}</span>
      {content}
    </div>
  );
}

// ── Run grouping ──────────────────────────────────────────────────────────────

interface Run {
  separator: ExecutionLine;
  lines: ExecutionLine[];
}

function groupIntoRuns(outputLines: ExecutionLine[]): Run[] {
  const runs: Run[] = [];
  for (const line of outputLines) {
    if (line.output_type === "separator") {
      runs.push({ separator: line, lines: [] });
    } else if (runs.length > 0) {
      runs[runs.length - 1].lines.push(line);
    }
  }
  return runs;
}

const LANG_LABEL: Record<string, string> = { js: "JS", ts: "TS", php: "PHP" };

function RunHeader({
  run, idx, collapsed, onToggle, isActive,
}: {
  run: Run; idx: number; collapsed: boolean; onToggle: (idx: number) => void; isActive: boolean;
}) {
  const lang = LANG_LABEL[run.separator.content] ?? run.separator.content.toUpperCase();
  const time = new Date(run.separator.timestamp).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const count = run.lines.length;

  return (
    <button
      onClick={() => onToggle(idx)}
      className="w-full flex items-center gap-2 px-3 py-1 text-xs hover:bg-white/5 border-b border-surface-700/60 transition-colors group"
    >
      <span className="text-gray-600 group-hover:text-gray-400 w-3 text-center shrink-0 font-mono">
        {collapsed ? "▶" : "▼"}
      </span>
      <span className={`font-mono font-semibold ${isActive ? "text-brand-400" : "text-gray-500"}`}>{lang}</span>
      <span className="text-gray-600">{time}</span>
      {isActive && <span className="text-brand-400 animate-pulse text-[10px]">●</span>}
      <span className="ml-auto text-gray-600 tabular-nums">{count} {count === 1 ? "line" : "lines"}</span>
    </button>
  );
}

// ── Console ───────────────────────────────────────────────────────────────────

export function Console() {
  const { outputLines, isRunning, clearOutput, settings } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [copied, setCopied] = useState(false);
  const [collapsedRuns, setCollapsedRuns] = useState<Set<number>>(new Set());
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showScrollTopBtn, setShowScrollTopBtn] = useState(false);
  const atBottomRef = useRef(true);
  const prevRunCount = useRef(0);

  const runs = useMemo(() => groupIntoRuns(outputLines), [outputLines]);

  // Auto-collapse all previous runs when a new run starts
  useEffect(() => {
    const count = runs.length;
    if (count > prevRunCount.current && count > 1) {
      setCollapsedRuns(new Set(Array.from({ length: count - 1 }, (_, i) => i)));
    }
    prevRunCount.current = count;
  }, [runs.length]);


  // Reset when output is fully cleared
  useEffect(() => {
    if (outputLines.length === 0) {
      setCollapsedRuns(new Set());
      prevRunCount.current = 0;
      atBottomRef.current = true;
      setShowScrollBtn(false);
    }
  }, [outputLines.length]);

  const toggleRun = (idx: number) => {
    setCollapsedRuns((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const allContentLines = useMemo(
    () => outputLines.filter((l) => l.output_type !== "separator"),
    [outputLines]
  );

  const handleCopy = async () => {
    if (!allContentLines.length) return;
    const text = allContentLines.map((l) => l.content).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Follow-mode: scroll with new output only if already at bottom
  useEffect(() => {
    if (atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [outputLines]);

  const checkAtBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    atBottomRef.current = bottom;
    setShowScrollBtn(!bottom);
    setShowScrollTopBtn(el.scrollTop > 50);
  }, []);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    atBottomRef.current = true;
    setShowScrollBtn(false);
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setShowScrollTopBtn(false);
  };

  useEffect(() => {
    if (showSearch) {
      searchRef.current?.focus();
      searchRef.current?.select();
    } else {
      setSearch("");
    }
  }, [showSearch]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "f") return;
      if (document.querySelector(".monaco-editor.focused")) return;
      e.preventDefault();
      setShowSearch((v) => !v);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = () => setShowSearch((v) => !v);
    window.addEventListener("vibelab:find-console", handler);
    return () => window.removeEventListener("vibelab:find-console", handler);
  }, []);

  const matchCount = search.trim()
    ? allContentLines.reduce(
        (n, l) => n + (l.content.toLowerCase().split(search.toLowerCase()).length - 1),
        0
      )
    : 0;

  const filteredLines = search.trim()
    ? allContentLines.filter((l) => l.content.toLowerCase().includes(search.toLowerCase()))
    : [];

  const isEmpty = runs.length === 0;

  return (
    <div className="relative flex flex-col h-full bg-surface-900">
      {/* Floating find bar */}
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
            disabled={!allContentLines.length}
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

      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1">
        {showScrollTopBtn && (
          <button
            onClick={scrollToTop}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-surface-700 border border-surface-500 text-gray-400 hover:text-gray-200 hover:bg-surface-600 shadow-lg transition-colors"
            title="Scroll to top"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4L14 11H2L8 4z"/>
            </svg>
          </button>
        )}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-surface-700 border border-surface-500 text-gray-400 hover:text-gray-200 hover:bg-surface-600 shadow-lg transition-colors"
            title="Scroll to bottom"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 12L2 5h12L8 12z"/>
            </svg>
          </button>
        )}
      </div>

      <div ref={scrollRef} onScroll={checkAtBottom} className="flex-1 overflow-y-auto py-2">
        {isEmpty ? (
          <div className="text-gray-600 text-sm font-mono px-4 py-3 italic">
            Run some code to see output…
          </div>
        ) : search.trim() ? (
          filteredLines.length === 0 ? (
            <div className="text-gray-600 text-sm font-mono px-4 py-3 italic">
              No output matches "{search}"
            </div>
          ) : (
            filteredLines.map((line, i) => (
              <Line key={`search-${line.timestamp}-${i}`} line={line} searchQuery={search} fontSize={settings.fontSize} />
            ))
          )
        ) : (
          runs.map((run, idx) => {
            const collapsed = collapsedRuns.has(idx);
            const isActive = idx === runs.length - 1 && isRunning;
            return (
              <div key={`run-${run.separator.timestamp}`}>
                {runs.length > 1 && (
                  <RunHeader run={run} idx={idx} collapsed={collapsed} onToggle={toggleRun} isActive={isActive} />
                )}
                {!collapsed && run.lines.map((line, i) => (
                  <Line key={`${line.timestamp}-${i}`} line={line} searchQuery="" fontSize={settings.fontSize} />
                ))}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
