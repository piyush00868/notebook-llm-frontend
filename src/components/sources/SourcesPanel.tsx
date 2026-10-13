import { PlusIcon } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import { SourceItem } from "@/components/sources/SourceItem";
import { SourcesEmptyState } from "@/components/sources/SourcesEmptyState";
import { cn } from "@/lib/utils";
import type { DocumentSource } from "@/types";

/**
 * Sources sidebar.
 *
 * Reads as workspace navigation rather than a dashboard: a plain label with a
 * count, a full-width add action, then a dense single-column list. Rendered
 * as the desktop sidebar or inside a mobile Sheet — one implementation, two
 * hosts.
 */
export function SourcesPanel({
  documents,
  isLoading,
  error,
  onAdd,
  onOpenSource,
  onDeleteSource,
  deletingId,
  className,
  headerExtra,
}: {
  documents: DocumentSource[];
  isLoading: boolean;
  error: string | null;
  onAdd: () => void;
  onOpenSource: (document: DocumentSource) => void;
  onDeleteSource: (document: DocumentSource) => void;
  deletingId: number | null;
  className?: string;
  headerExtra?: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col bg-sunken", className)}>
      <div className="flex h-12 shrink-0 items-center gap-2 px-4">
        <h2 className="text-[0.8125rem] font-semibold tracking-[0.01em] text-ink">
          Sources
        </h2>

        {!isLoading && !error ? (
          <span className="text-[0.75rem] tabular-nums text-ink-tertiary">
            {documents.length}
          </span>
        ) : null}

        {headerExtra ? (
          <div className="ml-auto flex items-center gap-1">{headerExtra}</div>
        ) : null}
      </div>

      <div className="shrink-0 px-3 pb-2">
        <button
          type="button"
          onClick={onAdd}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-surface px-2.5",
            "text-[0.8125rem] font-medium text-ink-secondary",
            "transition-colors hover:border-accent-border hover:bg-accent-soft hover:text-accent",
            "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25",
          )}
        >
          <PlusIcon className="size-4 text-accent" />
          Add source
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-subtle px-3 pb-4">
        {isLoading ? (
          <SourcesSkeleton />
        ) : error ? (
          <p className="px-1 py-4 text-[0.8125rem] text-danger">{error}</p>
        ) : documents.length === 0 ? (
          <SourcesEmptyState />
        ) : (
          <ul className="space-y-0.5">
            <AnimatePresence initial={false}>
              {documents.map((document) => (
                <SourceItem
                  key={document.id}
                  document={document}
                  onOpen={onOpenSource}
                  onDelete={onDeleteSource}
                  isDeleting={deletingId === document.id}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}

/** Mirrors SourceItem's height so the list doesn't resize on load. */
function SourcesSkeleton() {
  return (
    <ul role="status" aria-label="Loading sources" className="space-y-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <li key={index} className="flex items-center gap-2.5 px-2 py-2">
          <Skeleton className="size-7 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </li>
      ))}
      <span className="sr-only">Loading sources…</span>
    </ul>
  );
}