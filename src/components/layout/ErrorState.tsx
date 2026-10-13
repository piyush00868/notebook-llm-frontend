import { cn } from "@/lib/utils";
import { Loader2Icon, RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shared inline error state. Used wherever a data-driven surface fails so
 * failures always read the same way instead of blanking the screen.
 */
export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className,
  compact = false,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border border-danger/25 bg-danger/[0.04] text-left",
        compact ? "p-3" : "p-4",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-danger" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-ink">{title}</p>
          <p className="text-[0.8125rem] leading-relaxed text-ink-secondary break-words">
            {message}
          </p>
        </div>
      </div>

      {onRetry ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="bg-surface"
        >
          <RefreshCwIcon />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** Small spinner-free busy indicator for inline regions. */
export function BusyLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-ink-secondary">
      <Loader2Icon className="size-3.5 animate-spin" />
      {children}
    </span>
  );
}