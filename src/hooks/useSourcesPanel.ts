import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "mindora:sources-panel";

function readPreference(): boolean {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "open" || stored === "closed") return stored === "open";
  } catch {
    // Storage unavailable — default to open.
  }
  return true;
}

/**
 * Whether the sources sidebar is expanded on large screens.
 *
 * Persisted because the panel is a workspace preference, and because
 * collapsing it is a deliberate choice a user should not have to repeat on
 * every visit.
 */
export function useSourcesPanel() {
  const [isOpen, setIsOpen] = useState(readPreference);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, isOpen ? "open" : "closed");
    } catch {
      // Preference simply won't persist.
    }
  }, [isOpen]);

  const toggle = useCallback(() => setIsOpen((value) => !value), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, toggle, open, close };
}