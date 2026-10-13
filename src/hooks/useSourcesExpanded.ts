import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "mindora:sources-expanded";

function readPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "open";
  } catch {
    // Storage unavailable — fall back to the collapsed default.
  }
  // Collapsed by default: sources are context, the chat list is navigation.
  return false;
}

/**
 * Whether the sources list is revealed inside the sidebar.
 *
 * Starts collapsed so the chat list — the sidebar's primary navigation — gets
 * the space. Persisted because expanding sources is a deliberate choice, and
 * one a user should not have to repeat on every visit.
 */
export function useSourcesExpanded() {
  const [isExpanded, setIsExpanded] = useState(readPreference);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, isExpanded ? "open" : "closed");
    } catch {
      // Preference simply won't persist.
    }
  }, [isExpanded]);

  const toggle = useCallback(() => setIsExpanded((value) => !value), []);
  const expand = useCallback(() => setIsExpanded(true), []);
  const collapse = useCallback(() => setIsExpanded(false), []);

  return { isExpanded, toggle, expand, collapse };
}