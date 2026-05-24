import { useEffect, useState } from "react";
import { useSettings } from "../../hooks/useSettings";
import { useStore } from "../../store";
import type { Settings } from "../../types";

export function SettingsPanel() {
  const { toggleSettings } = useStore();
  const { settings, updateSettings } = useSettings();
  const [local, setLocal] = useState<Settings>({ ...settings });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocal({ ...settings });
  }, [settings]);

  const update = (partial: Partial<Settings>) =>
    setLocal((prev) => ({ ...prev, ...partial }));

  const handleSave = async () => {
    setSaving(true);
    await updateSettings(local);
    setSaving(false);
    toggleSettings();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[440px] bg-surface-800 rounded-xl shadow-2xl border border-surface-600">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-600">
          <h2 className="text-sm font-semibold text-gray-200">Settings</h2>
          <button
            onClick={toggleSettings}
            className="text-gray-400 hover:text-gray-200 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          <Row label="Theme">
            <select
              value={local.theme}
              onChange={(e) => update({ theme: e.target.value as "dark" | "light" })}
              className="bg-surface-700 border border-surface-500 rounded px-2 py-1 text-sm text-gray-200 outline-none focus:border-violet-500"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </Row>

          <Row label="Font size">
            <div className="flex items-center gap-2">
              <button
                onClick={() => update({ fontSize: Math.max(10, local.fontSize - 1) })}
                className="w-7 h-7 flex items-center justify-center rounded bg-surface-600 hover:bg-surface-500 text-gray-300"
              >
                −
              </button>
              <span className="text-sm text-gray-200 w-8 text-center">{local.fontSize}</span>
              <button
                onClick={() => update({ fontSize: Math.min(28, local.fontSize + 1) })}
                className="w-7 h-7 flex items-center justify-center rounded bg-surface-600 hover:bg-surface-500 text-gray-300"
              >
                +
              </button>
            </div>
          </Row>

          <Row label="Auto-run on type">
            <Toggle
              value={local.autoRun}
              onChange={(v) => update({ autoRun: v })}
            />
          </Row>

          {local.autoRun && (
            <Row label="Auto-run delay (ms)">
              <input
                type="number"
                value={local.autoRunDelay}
                onChange={(e) =>
                  update({ autoRunDelay: Math.max(100, Number(e.target.value)) })
                }
                className="w-24 bg-surface-700 border border-surface-500 rounded px-2 py-1 text-sm text-gray-200 outline-none focus:border-violet-500"
              />
            </Row>
          )}

          <div>
            <label className="text-sm text-gray-300 block mb-1.5">
              Node.js path
              <span className="text-gray-600 ml-1 text-xs">(leave empty to auto-detect)</span>
            </label>
            <input
              type="text"
              value={local.nodePath ?? ""}
              onChange={(e) => update({ nodePath: e.target.value || null })}
              placeholder="/usr/local/bin/node  or  /opt/homebrew/bin/node"
              className="w-full bg-surface-700 border border-surface-500 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-violet-500 font-mono"
            />
            {local.nodePath && (
              <button
                onClick={() => update({ nodePath: null })}
                className="mt-1 text-xs text-gray-500 hover:text-gray-300"
              >
                Clear (use auto-detect)
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-surface-600">
          <button
            onClick={toggleSettings}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 rounded hover:bg-surface-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white font-semibold rounded"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-300">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full transition-colors relative ${value ? "bg-violet-500" : "bg-surface-500"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : ""}`}
      />
    </button>
  );
}
