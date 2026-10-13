import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { Skeleton } from "@/components/ui/skeleton";
import { SourceItem } from "@/components/sources/SourceItem";
import { SourcesEmptyState } from "@/components/sources/SourcesEmptyState";
import { cn } from "@/lib/utils";
import type { DocumentSource } from "@/types";

/**
 * Sources sidebar.
 *
 * Collapsed by default: sources are context for the conversation, not the
 * primary navigation, so they yield their space to the chat list above. The
 * collapsed row keeps "Add source" reachable on the right — hiding it behind
 * the disclosure would leave no way to add one at all.
 *
 * Rendered as the desktop sidebar or inside a mobile Sheet — one
 * implementation, two hosts.
 */
export function SourcesPanel({
  documents,
  isLoading,
  error,
  isExpanded,
  onToggle,
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
  /** Whether the document list is revealed. */
  isExpanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
  onOpenSource: (document: DocumentSource) => void;
  onDeleteSource: (document: DocumentSource) => void;
  deletingId: number | null;
  className?: string;
  headerExtra?: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-h-0 flex-col bg-sunken", className)}>
      <div className="flex h-11 shrink-0 items-center gap-1 px-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls="notebook-sources-list"
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1",
            "transition-colors hover:bg-surface",
            "focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none",
          )}
        >
          <ChevronRightIcon
            aria-hidden="true"
            className={cn(
              "size-3.5 shrink-0 text-ink-tertiary transition-transform duration-150",
              isExpanded && "rotate-90",
            )}
          />
          <h2 className="truncate text-[0.8125rem] font-semibold tracking-[0.01em] text-ink">
            Sources
          </h2>
          {!isLoading && !error ? (
            <span className="text-[0.75rem] tabular-nums text-ink-tertiary">
              {documents.length}
            </span>
          ) : null}
        </button>

        {headerExtra ? (
          <div className="flex shrink-0 items-center gap-1">{headerExtra}</div>
        ) : null}

        {/*
          Add source stays in the header row whether or not the list is
          revealed, so it never disappears behind the disclosure.
        */}
        <button
          type="button"
          onClick={onAdd}
          className={cn(
            "flex h-7 shrink-0 items-center gap-1 rounded-md px-2",
            "text-[0.75rem] font-medium text-accent",
            "transition-colors hover:bg-accent-soft",
            "focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none",
          )}
        >
          <PlusIcon className="size-3.5" />
          Add source
        </button>
      </div>

      {/*
        The 0fr -> 1fr row trick animates the collapse without a measurement
        step. Both the property and the transition are set inline on purpose:
        Tailwind was not generating `grid-rows-[1fr]` / `grid-rows-[0fr]` for
        this build, so the utilities left the grid with no rows defined and
        the list rendered clipped to zero height.
      */}
      <div
        id="notebook-sources-list"
        className="grid min-h-0 flex-1"
        style={{
          gridTemplateRows: isExpanded ? "1fr" : "0fr",
          transition: "grid-template-rows 200ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {isExpanded ? (
          <div className="min-h-0 overflow-hidden">
            <div className="h-full overflow-y-auto overscroll-contain scroll-subtle px-3 pt-1 pb-4">
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
        ) : null}
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