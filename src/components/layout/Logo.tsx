import { cn } from "@/lib/utils";

/**
 * Product mark: a blue rounded square holding a ring with a solid centre —
 * a lens/record motif suggesting focus and recall.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-accent",
        className,
      )}
    >
      <svg viewBox="0 0 32 32" fill="none" className="size-full">
        <circle
          cx="16"
          cy="16"
          r="9"
          stroke="white"
          strokeOpacity="0.92"
          strokeWidth="2"
        />
        <circle cx="16" cy="16" r="3.5" fill="white" />
      </svg>
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-[1.0625rem] font-semibold tracking-[-0.02em] text-ink",
        className,
      )}
    >
      Mindora
    </span>
  );
}

export function BrandLockup({
  className,
  showWordmark = true,
  markClassName,
  wordmarkClassName,
}: {
  className?: string;
  showWordmark?: boolean;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Logo className={markClassName} />
      {showWordmark ? <Wordmark className={wordmarkClassName} /> : null}
    </span>
  );
}