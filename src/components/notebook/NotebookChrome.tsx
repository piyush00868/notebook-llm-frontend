import { UserButton } from "@clerk/clerk-react";
import { ArrowLeftIcon, PanelLeftIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { BrandLockup } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { pluralize } from "@/lib/format";

/** Height shared by the sidebar's brand row and the chat's title bar. */
export const BAR_HEIGHT_CLASS = "h-14";

/**
 * Brand row at the top of the sources sidebar.
 *
 * The sidebar is the application shell's leftmost, full-height region, so it
 * carries the product identity itself rather than deferring to a global header
 * that would sit above it. The collapse control sits at its right edge, where
 * the sidebar's boundary is, so the button visually owns what it controls.
 */
export function SidebarBrand({
  onToggle,
  isOpen,
}: {
  onToggle: () => void;
  isOpen: boolean;
}) {
  return (
    <div
      className={cn(
        BAR_HEIGHT_CLASS,
        "flex shrink-0 items-center gap-2 border-b border-line px-3",
      )}
    >
      <Link
        to="/workspace"
        aria-label="Mindora — back to my workspace"
        className="min-w-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
      >
        <BrandLockup />
      </Link>

      <div className="ml-auto">
        <SidebarToggle isOpen={isOpen} onToggle={onToggle} />
      </div>
    </div>
  );
}

/**
 * The sidebar's collapse control.
 *
 * Lives at the sidebar's right edge. It is also the only way to bring the
 * sidebar back once collapsed, which is why the collapsed rail renders it
 * again at the same relative position.
 */
export function SidebarToggle({
  isOpen,
  onToggle,
  className,
}: {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label={isOpen ? "Hide sources" : "Show sources"}
            aria-expanded={isOpen}
            aria-controls="notebook-sources-panel"
            className={cn(
              "text-ink-tertiary hover:bg-surface hover:text-ink",
              className,
            )}
          >
            <PanelLeftIcon />
          </Button>
        }
      />
      <TooltipContent side="bottom">
        {isOpen ? "Hide sources" : "Show sources"}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Chat-side title bar.
 *
 * Deliberately minimal: the notebook name and its source count, then the
 * account controls that would otherwise have had a header of their own. It
 * shares its height with the sidebar's brand row so the two read as one
 * continuous top edge.
 *
 * Below `lg` there is no persistent sidebar, so this bar takes over navigation
 * duties — back to the workspace, the brand, and the two source actions.
 */
export function NotebookTopBar({
  notebookName,
  sourceCount,
  isLoading,
  onOpenSources,
}: {
  notebookName?: string;
  sourceCount?: number;
  isLoading: boolean;
  /** Mobile: opens the sources sheet. */
  onOpenSources: () => void;
}) {
  return (
    <header
      className={cn(
        BAR_HEIGHT_CLASS,
        "z-30 flex shrink-0 items-center gap-2 border-b border-line bg-surface pr-2 pl-4 sm:pr-3",
      )}
    >
      {/* Mobile: back to the workspace, then the brand. */}
      <Button
        variant="ghost"
        size="icon"
        // The rendered element is an anchor, so Base UI must not impose button
        // semantics on it.
        nativeButton={false}
        render={<Link to="/workspace" aria-label="Back to my workspace" />}
        className="-ml-1 text-ink lg:hidden"
      >
        <ArrowLeftIcon />
      </Button>

      <span className="lg:hidden">
        <BrandLockup />
      </span>

      {/* Desktop: the notebook is the only thing this bar needs to say. */}
      <div className="hidden min-w-0 items-center gap-2.5 lg:flex">
        {isLoading ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          <h1 className="truncate text-[0.9375rem] font-medium tracking-[-0.01em] text-ink">
            {notebookName ?? "Notebook"}
          </h1>
        )}

        {sourceCount != null && sourceCount > 0 ? (
          <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-[0.6875rem] tabular-nums text-ink-tertiary">
            {pluralize(sourceCount, "source")}
          </span>
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* Mobile: sources sheet toggle and add source are both available
            from the sheet, so only the sheet toggle is shown here to keep
            the bar uncluttered on narrow screens. */}
        <div className="flex items-center gap-1 lg:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={onOpenSources}
            aria-label="Show sources"
            aria-controls="notebook-sources-panel"
            className="size-9"
          >
            <PanelLeftIcon />
          </Button>
        </div>

        <ThemeToggle />

        <UserButton
          appearance={{
            elements: {
              avatarBox:
                "size-8 rounded-full ring-2 ring-white shadow-subtle",
              userButtonPopoverCard: "rounded-xl border-line shadow-overlay",
              userButtonPopoverActionButton: "rounded-md",
              userButtonPopoverActions: "text-ink",
            },
          }}
        />
      </div>
    </header>
  );
}