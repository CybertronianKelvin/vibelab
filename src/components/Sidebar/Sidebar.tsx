import { useState } from "react";
import { useHistory } from "../../hooks/useHistory";
import { useSnippets } from "../../hooks/useSnippets";
import { useStore } from "../../store";
import type { HistoryEntry, Language, Snippet } from "../../types";

interface Props {
  onRun: (code: string, lang: Language) => void;
}

type Tab = "snippets" | "history";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function codePreview(code: string, max = 38): string {
  const first = code.trim().split("\n")[0] ?? "";
  return first.length > max ? first.slice(0, max) + "…" : first;
}

export function Sidebar({ onRun }: Props) {
  const {
    snippets,
    setCode,
    setLanguage,
    activeSnippetId,
    setActiveSnippetId,
    history,
    searchQuery,
    setSearchQuery,
  } = useStore();
  const { saveSnippet, deleteSnippet } = useSnippets();
  const { clearHistory } = useHistory();

  const [tab, setTab] = useState<Tab>("snippets");
  const [savingHistoryId, setSavingHistoryId] = useState<string | null>(null);
  const [historySnippetName, setHistorySnippetName] = useState("");

  const q = searchQuery.toLowerCase();

  const filteredSnippets = snippets.filter(
    (s) => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
  );

  const filteredHistory = history.filter(
    (h) => !q || h.code.toLowerCase().includes(q)
  );

  const handleLoad = (s: Snippet) => {
    setCode(s.code);
    setLanguage(s.language as Language);
    setActiveSnippetId(s.id);
  };

  const handleRunSnippet = (e: React.MouseEvent, s: Snippet) => {
    e.stopPropagation();
    handleLoad(s);
    onRun(s.code, s.language as Language);
  };

  const handleDelete = (e: React.MouseEvent, s: Snippet) => {
    e.stopPropagation();
    deleteSnippet(s.id);
    if (activeSnippetId === s.id) setActiveSnippetId(null);
  };

  const handleRunHistory = (e: React.MouseEvent, h: HistoryEntry) => {
    e.stopPropagation();
    setCode(h.code);
    setLanguage(h.language);
    setActiveSnippetId(null);
    onRun(h.code, h.language);
  };

  const handleStartSaveHistory = (e: React.MouseEvent, h: HistoryEntry) => {
    e.stopPropagation();
    setSavingHistoryId(h.id);
    setHistorySnippetName("");
  };

  const handleConfirmSaveHistory = async (h: HistoryEntry) => {
    if (!historySnippetName.trim()) return;
    await saveSnippet({
      id: "",
      name: historySnippetName.trim(),
      code: h.code,
      language: h.language,
      createdAt: "",
      updatedAt: "",
    });
    setSavingHistoryId(null);
    setHistorySnippetName("");
    setTab("snippets");
  };

  return (
    <aside className="w-56 flex flex-col border-r border-surface-600 bg-surface-800 shrink-0">
      {/* Search */}
      <div className="px-2 pt-2 pb-1">
        <input
          className="w-full bg-surface-700 border border-surface-500 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-brand-500"
          placeholder="Search…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-600 text-xs">
        <button
          onClick={() => setTab("snippets")}
          className={`flex-1 py-1.5 font-medium transition-colors ${
            tab === "snippets"
              ? "text-brand-400 border-b-2 border-brand-400"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          Snippets
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex-1 py-1.5 font-medium transition-colors ${
            tab === "history"
              ? "text-brand-400 border-b-2 border-brand-400"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          History
        </button>
      </div>

      {/* Snippets tab */}
      {tab === "snippets" && (
        <div className="flex-1 overflow-y-auto">
          {filteredSnippets.length === 0 ? (
            <p className="text-xs text-gray-500 px-3 py-4 italic">
              {q ? "No matches." : "No snippets yet — use + Snippet to save."}
            </p>
          ) : (
            filteredSnippets.map((s) => (
              <div
                key={s.id}
                onClick={() => handleLoad(s)}
                className={`group flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-surface-600 ${
                  activeSnippetId === s.id ? "bg-surface-700 border-l-2 border-brand-500" : ""
                }`}
                title="Click to load"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-brand-400 shrink-0">
                    {s.language.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-300 truncate">{s.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => handleRunSnippet(e, s)}
                    className="opacity-0 group-hover:opacity-100 text-brand-400 hover:text-brand-300 text-xs transition-opacity"
                    title="Run"
                  >
                    ▶
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, s)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-xs transition-opacity"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History tab */}
      {tab === "history" && (
        <div className="flex-1 overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <p className="text-xs text-gray-500 px-3 py-4 italic">
              {q ? "No matches." : "No history yet — click ▶ Run to start."}
            </p>
          ) : (
            <>
              {filteredHistory.map((h) => (
                <div key={h.id} className="group border-b border-surface-700">
                  {savingHistoryId === h.id ? (
                    <div className="flex items-center gap-1 px-2 py-1.5">
                      <input
                        autoFocus
                        className="flex-1 bg-surface-700 border border-surface-500 rounded px-2 py-0.5 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-brand-500"
                        placeholder="Snippet name…"
                        value={historySnippetName}
                        onChange={(e) => setHistorySnippetName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleConfirmSaveHistory(h);
                          if (e.key === "Escape") setSavingHistoryId(null);
                        }}
                      />
                      <button
                        onClick={() => handleConfirmSaveHistory(h)}
                        disabled={!historySnippetName.trim()}
                        className="text-brand-400 hover:text-brand-300 disabled:opacity-40 text-xs"
                        title="Save as snippet"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setSavingHistoryId(null)}
                        className="text-gray-500 hover:text-gray-300 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-1.5">
                      <span className="text-xs font-mono text-brand-400 shrink-0">
                        {h.language.toUpperCase()}
                      </span>
                      <span className="flex-1 text-xs text-gray-400 truncate font-mono">
                        {codePreview(h.code)}
                      </span>
                      <span className="text-xs text-gray-600 shrink-0">
                        {formatTime(h.ranAt)}
                      </span>
                      <button
                        onClick={(e) => handleRunHistory(e, h)}
                        className="opacity-0 group-hover:opacity-100 text-brand-400 hover:text-brand-300 text-xs transition-opacity"
                        title="Run"
                      >
                        ▶
                      </button>
                      <button
                        onClick={(e) => handleStartSaveHistory(e, h)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-200 text-xs transition-opacity"
                        title="Save as snippet"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={clearHistory}
                className="w-full py-1.5 text-xs text-gray-600 hover:text-red-400 transition-colors"
              >
                Clear history
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
