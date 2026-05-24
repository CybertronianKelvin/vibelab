import { useEffect, useState } from "react";
import { tauriClient } from "../../lib/tauri";
import { useStore } from "../../store";

export function PackageManager() {
  const { packages, setPackages, togglePackages } = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    tauriClient.listPackages().then(setPackages).catch(console.error);
  }, [setPackages]);

  const refresh = async () => {
    const updated = await tauriClient.listPackages();
    setPackages(updated);
  };

  const handleInstall = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setStatus(`Installing ${query}...`);
    try {
      await tauriClient.installPackage(query.trim());
      await refresh();
      setStatus(`Installed ${query}`);
      setQuery("");
    } catch (err) {
      setStatus(`Error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (name: string) => {
    setLoading(true);
    setStatus(`Removing ${name}...`);
    try {
      await tauriClient.removePackage(name);
      await refresh();
      setStatus(`Removed ${name}`);
    } catch (err) {
      setStatus(`Error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[480px] bg-surface-800 rounded-lg shadow-2xl border border-surface-600">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-600">
          <h2 className="text-sm font-semibold text-gray-200">npm Packages</h2>
          <button onClick={togglePackages} className="text-gray-400 hover:text-gray-200">x</button>
        </div>
        <div className="p-5">
          <div className="flex gap-2 mb-3">
            <input className="flex-1 bg-surface-700 border border-surface-500 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
              placeholder="Package name (e.g. lodash)" value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInstall()} autoFocus />
            <button onClick={handleInstall} disabled={loading || !query.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded">Install</button>
          </div>
          {status && <p className="text-xs font-mono text-gray-400 mb-3">{status}</p>}
          <div className="max-h-60 overflow-y-auto">
            {packages.length === 0
              ? <p className="text-xs text-gray-500 italic">No packages installed.</p>
              : packages.map((pkg) => (
                <div key={pkg.name} className="flex items-center justify-between py-2 border-b border-surface-600 last:border-0">
                  <div>
                    <span className="text-sm text-gray-200">{pkg.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{pkg.version}</span>
                  </div>
                  <button onClick={() => handleRemove(pkg.name)} disabled={loading}
                    className="text-xs text-gray-500 hover:text-red-400 disabled:opacity-40">Remove</button>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
