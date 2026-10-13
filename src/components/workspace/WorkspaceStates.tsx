import { Skeleton } from "@/components/ui/skeleton";

/** Loading grid — mirrors the real card proportions to avoid a layout jump. */
export function NotebookGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading notebooks"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex min-h-[7.25rem] flex-col rounded-xl border border-line bg-surface p-5"
        >
          <div className="flex items-start gap-3.5">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">Loading notebooks…</span>
    </div>
  );
}

/**
 * First-run empty state. Mirrors the landing page's tone: a short promise
 * and one obvious next step.
 */
export function WorkspaceEmptyState() {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
      <h2 className="text-base font-medium text-ink">No notebooks yet</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-secondary">
        A notebook is a private knowledge space. Add PDFs, websites, videos
        or notes, then ask questions that are answered only from those
        sources.
      </p>
    </div>
  );
}