import { Link } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { BrandLockup } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/utils";

/**
 * Slim application bar.
 *
 * Shared by the workspace and the notebook: the Flowstep design shows the
 * same bar on both — mark and wordmark left, theme and account right.
 */
export function AppBar({
  children,
  className,
  /** The notebook places its own back control before the brand. */
  leading,
}: {
  children?: React.ReactNode;
  className?: string;
  leading?: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        "z-30 shrink-0 border-b border-line bg-surface",
        className,
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-[68rem] items-center gap-3 px-4 sm:px-6">
        {leading}

        <Link
          to="/workspace"
          aria-label="Mindora home"
          className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          <BrandLockup />
        </Link>

        {children ? <div className="min-w-0 flex-1">{children}</div> : null}

        <div className={cn("flex items-center gap-1", children ? "" : "ml-auto")}>
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
      </div>
    </header>
  );
}