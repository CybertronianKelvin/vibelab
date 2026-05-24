import { useSettings } from "../../hooks/useSettings";
import { useStore } from "../../store";

export function SettingsPanel() {
  const { toggleSettings } = useStore();
  const { settings, updateSettings } = useSettings();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[420px] bg-surface-800 rounded-lg shadow-2xl border border-surface-600">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-600">
          <h2 className="text-sm font-semibold text-gray-200">Settings</h2>
          <button onClick={toggleSettings} className="text-gray-400 hover:text-gray-200">x</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">Theme</label>
            <select value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value as "dark" | "light" })}
              className="bg-surface-700 border border-surface-500 rounded px-2 py-1 text-sm text-gray-200 outline-none">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">Font Size</label>
            <div className="flex items-center gap-2">
              <button onClick={() => updateSettings({ fontSize: Math.max(10, settings.fontSize - 1) })}
                className="w-6 h-6 flex items-center justify-center rounded bg-surface-600 text-gray-300">-</button>
              <span className="text-sm text-gray-200 w-8 text-center">{settings.fontSize}</span>
              <button onClick={() => updateSettings({ fontSize: Math.min(28, settings.fontSize + 1) })}
                className="w-6 h-6 flex items-center justify-center rounded bg-surface-600 text-gray-300">+</button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-300">Auto-run on type</label>
            <button onClick={() => updateSettings({ autoRun: !settings.autoRun })}
              className={`w-10 h-5 rounded-full transition-colors relative ${settings.autoRun ? "bg-blue-600" : "bg-surface-500"}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${settings.autoRun ? "translate-x-5" : ""}`} />
            </button>
          </div>

          {settings.autoRun && (
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300">Delay (ms)</label>
              <input type="number" value={settings.autoRunDelay}
                onChange={(e) => updateSettings({ autoRunDelay: Math.max(100, Number(e.target.value)) })}
                className="w-20 bg-surface-700 border border-surface-500 rounded px-2 py-1 text-sm text-gray-200 outline-none" />
            </div>
          )}

          <div>
            <label className="text-sm text-gray-300 block mb-1">Node.js path (leave empty to auto-detect)</label>
            <input type="text" value={settings.nodePath ?? ""}
              onChange={(e) => updateSettings({ nodePath: e.target.value || null })}
              placeholder="/usr/local/bin/node"
              className="w-full bg-surface-700 border border-surface-500 rounded px-2 py-1 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
