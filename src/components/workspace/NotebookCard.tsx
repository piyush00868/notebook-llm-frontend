import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { BookOpenIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/format";
import type { Notebook } from "@/types";

/**
 * Notebook card.
 *
 * Flowstep's workspace grid: a flat white card with a blue notebook glyph,
 * the name, and a `12 sources · Updated 2 hours ago` meta line, plus a
 * chevron that appears on hover. The whole card is one link, so it stays
 * keyboard reachable without extra handlers.
 */
export function NotebookCard({
  notebook,
  sourceCount,
  isDeleting = false,
  onDelete,
}: {
  notebook: Notebook;
  /** Undefined until the count resolves, so the row can show a skeleton. */
  sourceCount?: number;
  isDeleting?: boolean;
  onDelete?: (notebook: Notebook) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      <Link
        to={`/notebook/${notebook.id}`}
        className={cn(
          "flex min-h-[7.25rem] flex-col rounded-xl border border-line bg-surface p-5",
          "transition-[border-color,box-shadow] duration-200",
          "hover:border-line-strong hover:shadow-raised",
          "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25",
          isDeleting && "pointer-events-none opacity-50",
        )}
      >
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"
          >
            <BookOpenIcon className="size-5" />
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[0.9375rem] leading-snug font-medium tracking-[-0.015em] text-ink">
              {notebook.name}
            </h3>

            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-ink-tertiary">
              {sourceCount === undefined ? (
                <span
                  className="inline-block h-3 w-24 rounded bg-sunken"
                  aria-label="Loading source count"
                />
              ) : (
                <>
                  <span className="tabular-nums">
                    {sourceCount} {sourceCount === 1 ? "source" : "sources"}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Updated {formatRelativeTime(notebook.updatedAt)}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </Link>

      <ChevronRightIcon
        aria-hidden="true"
        className="absolute right-5 top-1/2 size-4 -translate-y-1/2 text-ink-tertiary opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
      />

      {onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(notebook)}
          disabled={isDeleting}
          className={cn(
            "absolute right-3 top-3 rounded-md p-1.5 text-ink-tertiary",
            "opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger",
            "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
            "group-hover:opacity-100 group-focus-within:opacity-100",
          )}
          aria-label={`Delete notebook ${notebook.name}`}
        >
          <svg
            viewBox="0 0 16 16"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8h6l.5-8" />
          </svg>
        </button>
      ) : null}
    </motion.div>
  );
}