import { useEffect, useMemo, useRef, useState } from "react";
import { useApi } from "@/lib/api";
import type { Notebook } from "@/types";

/** Fetches at most this many notebooks at once. */
const CONCURRENCY = 4;

type Counts = Record<number, number>;

/**
 * Resolves the document count for each notebook on the workspace grid.
 *
 * `GET /workspaces/:id` embeds notebooks without their documents, so the
 * count requires reading each notebook. Counts already present on a
 * payload are derived during render; only genuinely missing ones are
 * fetched, at a bounded concurrency, so cards never block on the network.
 *
 * TODO(backend): include a document count (or the `documents` relation) on
 * the workspace payload to remove this N+1 read entirely.
 */
export function useNotebookSourceCounts(notebooks: Notebook[]) {
  const api = useApi();
  const [fetched, setFetched] = useState<Counts>({});

  // Ids already requested, so a re-render never refetches resolved notebooks.
  const requested = useRef<Set<number>>(new Set());

  const signature = notebooks.map((notebook) => notebook.id).join(",");

  // Counts derivable from the payload we already hold — no fetching needed.
  const embedded = useMemo(() => {
    const result: Counts = {};
    for (const notebook of notebooks) {
      if (notebook.documents) {
        result[notebook.id] = notebook.documents.length;
      }
    }
    return result;
  }, [notebooks]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const queue = notebooks.filter(
      (notebook) =>
        notebook.documents == null && !requested.current.has(notebook.id),
    );

    if (queue.length === 0) return;

    const cursor = { value: 0 };

    const settle = (id: number, count: number) => {
      requested.current.add(id);
      if (!active) return;
      setFetched((current) =>
        current[id] === count ? current : { ...current, [id]: count },
      );
    };

    const worker = async () => {
      while (cursor.value < queue.length) {
        const notebook = queue[cursor.value++]!;

        try {
          const detail = await api.getNotebook(
            notebook.id,
            controller.signal,
          );
          if (!active) return;
          settle(notebook.id, (detail.documents ?? []).length);
        } catch {
          // A notebook we cannot read shows 0 rather than a permanent
          // placeholder, and is marked requested so it is not retried in a loop.
          if (!active) return;
          settle(notebook.id, 0);
        }
      }
    };

    const run = async () => {
      await Promise.all(
        Array.from(
          { length: Math.min(CONCURRENCY, queue.length) },
          () => worker(),
        ),
      );
    };

    void run();

    return () => {
      active = false;
      controller.abort();
    };
    // `signature` is a stable string of ids, so a re-render with equal
    // content does not restart the queue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, signature]);

  return { ...fetched, ...embedded };
}