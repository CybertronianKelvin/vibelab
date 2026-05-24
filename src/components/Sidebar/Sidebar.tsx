import { useState } from "react";
import { useSnippets } from "../../hooks/useSnippets";
import { useStore } from "../../store";
import type { Snippet } from "../../types";

export function Sidebar() {
  const { snippets, code, language, setCode, setLanguage } = useStore();
  const { saveSnippet, deleteSnippet } = useSnippets();
  const [newName, setNewName] = useState("");

  const handleSave = async () => {
    if (!newName.trim()) return;
    await saveSnippet({ id: "", name: newName.trim(), code, language, createdAt: "", updatedAt: "" });
    setNewName("");
  };

  const handleLoad = (s: Snippet) => {
    setCode(s.code);
    setLanguage(s.language as "js" | "ts");
  };

  return (
    <aside className="w-56 flex flex-col border-r border-surface-600 bg-surface-800 shrink-0">
      <div className="px-3 py-2 border-b border-surface-600">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Snippets</span>
      </div>
      <div className="p-2 border-b border-surface-600">
        <div className="flex gap-1">
          <input className="flex-1 bg-surface-700 border border-surface-500 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
            placeholder="Name..." value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()} />
          <button onClick={handleSave} disabled={!newName.trim()}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs rounded">+</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {snippets.length === 0
          ? <p className="text-xs text-gray-500 px-3 py-4 italic">No snippets yet.</p>
          : snippets.map((s) => (
            <div key={s.id} onClick={() => handleLoad(s)}
              className="group flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-surface-600">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-mono text-blue-400 shrink-0">{s.language.toUpperCase()}</span>
                <span className="text-xs text-gray-300 truncate">{s.name}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteSnippet(s.id); }}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 text-xs">x</button>
            </div>
          ))
        }
      </div>
    </aside>
  );
}
