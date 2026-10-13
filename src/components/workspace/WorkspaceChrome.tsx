import { Skeleton } from "@/components/ui/skeleton";
import { pluralize } from "@/lib/format";

/**
 * Workspace footer strip.
 *
 * Flowstep closes the page with a hairline and two quiet facts about the
 * workspace rather than leaving the grid floating.
 */
export function WorkspaceFooter({
  workspaceName,
  isLoading,
  syncedAt,
}: {
  workspaceName?: string;
  isLoading?: boolean;
  syncedAt?: Date;
}) {
  return (
    <footer className="mt-14 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-5 text-[0.8125rem] text-ink-tertiary">
      <span>{workspaceName ?? "Private workspace"}</span>
      <span>
        {isLoading ? (
          <Skeleton className="inline-block h-3 w-24 align-middle" />
        ) : syncedAt ? (
          `Synced ${formatSynced(syncedAt)}`
        ) : (
          "Private workspace"
        )}
      </span>
    </footer>
  );
}

/** "just now" / "2 minutes ago" — short enough for a footer. */
function formatSynced(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);

  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;

  return `${Math.round(seconds / 3600)} hr ago`;
}

/** Eyebrow label used above the workspace heading. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-accent">
      {children}
    </p>
  );
}

/** Heading + description + primary action, matching the Flowstep workspace. */
export function WorkspaceHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
      <div className="min-w-0 max-w-xl space-y-3">
        <Eyebrow>My workspace</Eyebrow>
        <h1 className="text-[2rem] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-[2.5rem]">
          {title}
        </h1>
        <p className="text-[0.9375rem] leading-relaxed text-ink-secondary">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Section rule + "Your notebooks · N" label. */
export function WorkspaceSectionLabel({ count }: { count: number }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-line pb-4">
      <h2 className="text-[1.0625rem] font-medium tracking-[-0.02em] text-ink">
        Your notebooks
      </h2>
      <span className="text-sm text-ink-tertiary">{pluralize(count, "notebook")}</span>
    </div>
  );
}