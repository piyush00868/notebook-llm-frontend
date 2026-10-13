import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ThemeContext,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeContextValue,
  type ThemePreference,
} from "@/lib/themeContext";

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Storage unavailable — fall back to the system preference.
  }
  return "system";
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Single owner of the `dark` class.
 *
 * This must live at the app root, above the router. When each ThemeToggle
 * held its own hook instance, two mounted toggles applied conflicting classes
 * and a toggle inside a remounting route lost its state mid-session.
 *
 * `resolvedTheme` is derived during render, so applying the class never
 * triggers a second render pass.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [systemSnapshot, setSystemSnapshot] = useState<ResolvedTheme>(() =>
    systemTheme(),
  );

  // Only listen to the OS while following it.
  useEffect(() => {
    if (preference !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemSnapshot(systemTheme());
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  const resolvedTheme: ResolvedTheme =
    preference === "system" ? systemSnapshot : preference;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Preference simply won't persist.
    }
  }, [preference, resolvedTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      setPreference: setPreferenceState,
      toggle: () =>
        setPreferenceState(resolvedTheme === "dark" ? "light" : "dark"),
    }),
    [preference, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}