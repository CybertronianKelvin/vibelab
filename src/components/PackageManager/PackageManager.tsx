import { useEffect, useRef, useState } from "react";
import { tauriClient } from "../../lib/tauri";
import { useStore } from "../../store";

interface NpmResult {
  name: string;
  version: string;
  description: string;
}

const NPM_SEARCH = "https://registry.npmjs.org/-/v1/search";

export function PackageManager() {
  const { packages, setPackages, togglePackages } = useStore();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<NpmResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tauriClient.listPackages().then(setPackages).catch(() => {});
  }, [setPackages]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const searchNpm = (q: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSuggestions([]); setShowSuggestions(false); return; }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${NPM_SEARCH}?text=${encodeURIComponent(q)}&size=8`);
        const data = await res.json() as { objects: { package: NpmResult }[] };
        const results = data.objects.map((o) => o.package);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    searchNpm(value);
  };

  const selectSuggestion = (name: string) => {
    setQuery(name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const refresh = async () => {
    const updated = await tauriClient.listPackages();
    setPackages(updated);
  };

  const handleInstall = async (nameOverride?: string) => {
    const name = (nameOverride ?? query).trim();
    if (!name) return;
    setLoading(true);
    setShowSuggestions(false);
    setStatus(`Installing ${name}…`);
    try {
      await tauriClient.installPackage(name);
      await refresh();
      setStatus(`Installed ${name}`);
      setQuery("");
      setSuggestions([]);
    } catch (err) {
      setStatus(`Error: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (name: string) => {
    setLoading(true);
    setStatus(`Removing ${name}…`);
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
      <div className="w-[500px] bg-surface-800 rounded-xl shadow-2xl border border-surface-600">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-600">
          <h2 className="text-sm font-semibold text-gray-200">npm Packages</h2>
          <button onClick={togglePackages} className="text-gray-400 hover:text-gray-200 text-lg leading-none">×</button>
        </div>

        <div className="p-5">
          <div ref={wrapperRef} className="relative mb-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  className="w-full bg-surface-700 border border-surface-500 rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
                  placeholder="Search npm (e.g. lodash, axios, dayjs)"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { handleInstall(); setShowSuggestions(false); }
                    if (e.key === "Escape") setShowSuggestions(false);
                  }}
                  autoFocus
                />
                {searching && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 animate-pulse">
                    searching…
                  </span>
                )}
              </div>
              <button
                onClick={() => handleInstall()}
                disabled={loading || !query.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm rounded whitespace-nowrap"
              >
                Install
              </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-surface-700 border border-surface-500 rounded-lg shadow-xl overflow-hidden"
                style={{ maxHeight: "260px", overflowY: "auto" }}>
                {suggestions.map((pkg) => (
                  <button
                    key={pkg.name}
                    className="w-full text-left px-3 py-2.5 hover:bg-surface-600 flex items-start gap-3 border-b border-surface-600 last:border-0"
                    onMouseDown={(e) => { e.preventDefault(); selectSuggestion(pkg.name); }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-200">{pkg.name}</span>
                        <span className="text-xs text-gray-500 shrink-0">{pkg.version}</span>
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{pkg.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-blue-400 shrink-0 mt-0.5">install ↵</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {status && (
            <p className="text-xs font-mono px-1 mb-3 text-gray-400">{status}</p>
          )}

          <div className="max-h-52 overflow-y-auto">
            {packages.length === 0 ? (
              <p className="text-xs text-gray-500 italic text-center py-4">No packages installed.</p>
            ) : (
              packages.map((pkg) => (
                <div
                  key={pkg.name}
                  className="flex items-center justify-between py-2.5 border-b border-surface-600 last:border-0"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-gray-200">{pkg.name}</span>
                    <span className="text-xs text-gray-500">{pkg.version}</span>
                  </div>
                  <button
                    onClick={() => handleRemove(pkg.name)}
                    disabled={loading}
                    className="text-xs text-gray-500 hover:text-red-400 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
