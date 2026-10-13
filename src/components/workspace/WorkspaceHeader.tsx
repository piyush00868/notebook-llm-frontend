import { Link } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { BrandLockup } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Workspace header. Deliberately quiet: the notebook grid is the content,
 * so the bar only carries identity, workspace context and account access.
 */
export function WorkspaceHeader({
  workspaceName,
  isLoadingWorkspace,
}: {
  workspaceName?: string;
  isLoadingWorkspace?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Link
          to="/workspace"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          aria-label="Mindora home"
        >
          <BrandLockup />
        </Link>

        <span aria-hidden="true" className="h-4 w-px bg-line" />

        <div className="min-w-0">
          {isLoadingWorkspace ? (
            <Skeleton className="h-3.5 w-32" />
          ) : (
            <p className="truncate text-[0.8125rem] text-ink-secondary">
              {workspaceName ?? "Workspace"}
            </p>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-7",
                userButtonPopoverCard: "rounded-lg border-line shadow-overlay",
                userButtonPopoverActions: "text-ink",
                userButtonPopoverActionButton: "hover:bg-sunken",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}

/** Section heading used above the notebook grid. */
export function SectionHeading({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-3",
        className,
      )}
    >
      <div className="space-y-1.5">
        <h1 className="text-[1.375rem] font-semibold tracking-[-0.025em]">
          {title}
        </h1>
        {description ? (
          <p className="text-sm leading-relaxed text-ink-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}