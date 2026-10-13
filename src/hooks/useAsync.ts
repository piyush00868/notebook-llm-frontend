import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  /** True until a value has resolved for the current key. */
  isLoading: boolean;
  refresh: () => void;
}

type Loader<T> = (signal: AbortSignal) => Promise<T>;

interface Result<T> {
  key: string;
  data: T | null;
  error: string | null;
  settled: boolean;
}

function toMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

/**
 * Loads one value whenever `key` changes.
 *
 * `key` identifies the subject (e.g. `"document:42"`). Results are stored
 * against that key and the loading flag is derived from it, so no `setState`
 * runs synchronously inside the effect — that would cause a cascading render.
 *
 * The loader is deliberately kept out of the effect's dependency list.
 * Callers pass an inline arrow, so its identity changes on every render;
 * storing it in state (to compare identities) produces a fresh object each
 * render, which loops forever. It is instead held in a ref that is refreshed
 * in a preceding effect, so the fetch effect only re-runs when `key` does.
 *
 * Previous data stays visible while a new key loads, so a panel never
 * flashes empty.
 */
export function useAsync<T>(
  key: string | null,
  loader: Loader<T>,
  options: { enabled?: boolean; errorMessage?: string } = {},
): AsyncState<T> {
  const { enabled = true, errorMessage } = options;

  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<Result<T>>({
    key: "",
    data: null,
    error: null,
    settled: false,
  });

  const loaderRef = useRef(loader);
  const errorRef = useRef(errorMessage ?? "Something went wrong.");

  // Declared before the fetch effect so the ref is current when it runs.
  useEffect(() => {
    loaderRef.current = loader;
    errorRef.current = errorMessage ?? "Something went wrong.";
  });

  useEffect(() => {
    if (!key || !enabled) return;

    const controller = new AbortController();
    let active = true;

    loaderRef.current(controller.signal).then(
      (data: T) => {
        if (active) setResult({ key, data, error: null, settled: true });
      },
      (cause: unknown) => {
        if (!active || controller.signal.aborted) return;
        setResult({
          key,
          data: null,
          error: toMessage(cause, errorRef.current),
          settled: true,
        });
      },
    );

    return () => {
      active = false;
      controller.abort();
    };
  }, [key, enabled, nonce]);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  const settled = result.key === key && result.settled;

  return {
    data: result.data,
    error: settled ? result.error : null,
    isLoading: Boolean(key) && enabled && !settled,
    refresh,
  };
}