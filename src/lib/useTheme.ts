import { useContext } from "react";
import { ThemeContext, type ThemeContextValue } from "@/lib/themeContext";

/**
 * Reads the shared theme state.
 *
 * Must be used inside `<ThemeProvider>`. Falling back to a local copy would
 * reintroduce the multi-instance bug this replaced, so a missing provider is
 * a hard error rather than a silent default.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}