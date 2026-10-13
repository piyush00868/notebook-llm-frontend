import { FilePlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Empty state for a notebook with no sources.
 *
 * Teaches the mental model — answers come from sources, so sources come
 * first — without duplicating the panel's own "Add source" button directly
 * above it.
 */
export function SourcesEmptyState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-dashed border-line-strong px-4 py-8 text-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent"
      >
        <FilePlusIcon className="size-4" />
      </span>

      <h3 className="mt-3 text-[0.8125rem] font-medium text-ink">No sources yet</h3>

      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-secondary">
        Add a PDF, website, YouTube video, or text to start building your
        notebook.
      </p>
    </div>
  );
}