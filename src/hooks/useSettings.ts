import { useCallback } from "react";
import { tauriClient } from "../lib/tauri";
import { useStore } from "../store";
import type { Settings } from "../types";

export function useSettings() {
  const { settings, setSettings } = useStore();

  const applyTheme = (theme: string) => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  };

  const loadSettings = useCallback(async () => {
    const s = await tauriClient.getSettings();
    setSettings(s);
    applyTheme(s.theme);
  }, [setSettings]);

  const updateSettings = useCallback(
    async (updates: Partial<Settings>) => {
      const updated = { ...settings, ...updates };
      setSettings(updated);
      try {
        await tauriClient.saveSettings(updated);
        applyTheme(updated.theme);
      } catch (err) {
        setSettings(settings);
        console.error("Failed to save settings:", err);
      }
    },
    [settings, setSettings]
  );

  return { settings, loadSettings, updateSettings };
}
