import { useCallback, useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/api";
import type { DocumentSource, Notebook } from "@/types";

/** Documents left processing are polled until the backend marks them done. */
const PROCESSING_POLL_MS = 6_000;

export interface NotebookState {
  notebook: Notebook | null;
  documents: DocumentSource[];
  isInitialLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => void;
  addSource: (input: AddSourceInput) => Promise<void>;
  removeSource: (documentId: number) => Promise<void>;
}

export type AddSourceInput =
  | { kind: "file"; file: File; title: string }
  | { kind: "website"; url: string; title: string }
  | { kind: "youtube"; url: string; title: string }
  | { kind: "text"; title: string; content: string };

interface LoadState {
  /** Request key this state belongs to; used to derive loading flags. */
  key: number;
  notebook: Notebook | null;
  error: string | null;
}

function isProcessing(document: DocumentSource) {
  return document.status === "PENDING" || document.status === "PROCESSING";
}

function describeError(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

/**
 * Loads a notebook with its embedded sources and exposes the add/remove
 * actions backed by the existing document endpoints.
 *
 * Loading flags are derived from a request key rather than set inside the
 * effect, so a refresh never triggers a cascading synchronous render.
 */
export function useNotebook(notebookId: number | null): NotebookState {
  const api = useApi();

  const [requestKey, setRequestKey] = useState(0);
  const [state, setState] = useState<LoadState>({
    key: -1,
    notebook: null,
    error: null,
  });

  useEffect(() => {
    if (!notebookId) return;

    const key = requestKey;
    const controller = new AbortController();
    let active = true;

    api
      .getNotebook(notebookId, controller.signal)
      .then((notebook) => {
        if (!active) return;
        setState({ key, notebook, error: null });
      })
      .catch((cause: unknown) => {
        if (!active || controller.signal.aborted) return;
        setState((current) =>
          current.key === key
            ? current
            : { key, notebook: null, error: describeError(cause, "We could not load this notebook.") },
        );
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [api, notebookId, requestKey]);

  const notebook = state.key === requestKey ? state.notebook : null;
  const error = state.key === requestKey ? state.error : null;

  const isInitialLoading = notebookId !== null && state.key !== requestKey && !error;
  const isRefreshing =
    notebookId !== null && state.key === requestKey && notebook === null && !error;

  const documents = useMemo(
    () => (notebook?.documents ?? []).filter((doc) => doc !== null),
    [notebook],
  );

  // Keep polling while anything is still processing so status badges resolve
  // without a manual refresh. Asynchronous backend ingestion surfaces
  // COMPLETED or FAILED here.
  const hasProcessing = documents.some(isProcessing);

  useEffect(() => {
    if (!hasProcessing || isInitialLoading) return;

    const timer = window.setInterval(() => {
      setRequestKey((value) => value + 1);
    }, PROCESSING_POLL_MS);

    return () => window.clearInterval(timer);
  }, [hasProcessing, isInitialLoading]);

  const refresh = useCallback(() => setRequestKey((value) => value + 1), []);

  const addSource = useCallback(
    async (input: AddSourceInput) => {
      if (!notebookId) throw new Error("Notebook id is missing.");

      switch (input.kind) {
        case "file": {
          const { document } = await api.uploadDocument({
            notebookId,
            title: input.title,
            file: input.file,
          });
          mergeDocument(requestKey, setState, document);
          return;
        }
        case "website": {
          const document = await api.addWebsiteSource({
            notebookId,
            title: input.title,
            url: input.url,
          });
          mergeDocument(requestKey, setState, document);
          return;
        }
        case "youtube": {
          const document = await api.addYoutubeSource({
            notebookId,
            title: input.title,
            url: input.url,
          });
          mergeDocument(requestKey, setState, document);
          return;
        }
        case "text": {
          // The route chunks and embeds before responding, so the returned
          // status is already the real one -- no optimistic override.
          const document = await api.createTextSource({
            notebookId,
            title: input.title,
            content: input.content,
          });

          mergeDocument(requestKey, setState, document);
          return;
        }
      }
    },
    [api, notebookId, requestKey],
  );

  const removeSource = useCallback(
    async (documentId: number) => {
      await api.deleteDocument(documentId);
      setState((current) => {
        if (!current.notebook) return current;
        return {
          ...current,
          notebook: {
            ...current.notebook,
            documents: (current.notebook.documents ?? []).filter(
              (doc) => doc !== null && doc.id !== documentId,
            ),
          },
        };
      });
    },
    [api],
  );

  return {
    notebook,
    documents,
    isInitialLoading,
    isRefreshing,
    error,
    refresh,
    addSource,
    removeSource,
  };
}

/** Insert or replace a document in the current notebook payload. */
function mergeDocument(
  key: number,
  setState: React.Dispatch<React.SetStateAction<LoadState>>,
  document: DocumentSource,
) {
  setState((current) => {
    if (!current.notebook) return current;

    const existing = current.notebook.documents ?? [];
    const index = existing.findIndex(
      (doc) => doc !== null && doc.id === document.id,
    );

    const next =
      index === -1
        ? [document, ...existing]
        : existing.map((doc, i) => (i === index ? document : doc));

    return {
      ...current,
      key,
      notebook: { ...current.notebook, documents: next },
    };
  });
}

/** Turns any thrown value into a message safe to show a user. */
export function describeAddError(error: unknown): string {
  return describeError(error, "We could not add that source.");
}