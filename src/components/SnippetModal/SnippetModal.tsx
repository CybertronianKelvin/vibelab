import { useState } from "react";
import { useSnippets } from "../../hooks/useSnippets";
import { useStore } from "../../store";

export function SnippetModal() {
  const { code, language, project, setCode, setActiveSnippetId, toggleSnippetModal } = useStore();
  const { saveSnippet } = useSnippets();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await saveSnippet({ id: "", name: name.trim(), code, language, createdAt: "", updatedAt: "", projectPath: project?.path ?? null, projectType: project?.type ?? null });
    setCode("");
    setActiveSnippetId(null);
    setSaving(false);
    toggleSnippetModal();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") toggleSnippetModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-80 bg-surface-800 rounded-xl shadow-2xl border border-surface-600">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-600">
          <h2 className="text-sm font-semibold text-gray-200">Save Snippet</h2>
          <button
            onClick={toggleSnippetModal}
            className="text-gray-400 hover:text-gray-200 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          <label className="text-xs text-gray-400 block mb-1.5">Snippet name</label>
          <input
            autoFocus
            className="w-full bg-surface-700 border border-surface-500 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-brand-500"
            placeholder="My snippet…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <p className="mt-2 text-xs text-gray-600 font-mono truncate">
            {language.toUpperCase()} · {code.trim().split("\n")[0]?.slice(0, 50) ?? ""}
          </p>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-600">
          <button
            onClick={toggleSnippetModal}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 rounded hover:bg-surface-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-5 py-2 text-sm font-semibold bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white rounded"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
