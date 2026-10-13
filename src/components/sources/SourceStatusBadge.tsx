import { TriangleAlertIcon, CircleDashedIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { sourceStatus, sourceStatusLabel } from "@/lib/format";
import type { DocumentSource } from "@/types";

/**
 * Compact ingestion state.
 *
 * Flowstep renders it as plain text after a separator (`PDF · Ready`), so this
 * stays text-first and only adds an icon for the non-ready states where the
 * status actually needs explaining.
 */
export function SourceStatusBadge({
  document,
  className,
}: {
  document: Pick<DocumentSource, "status">;
  className?: string;
}) {
  const status = sourceStatus(document);

  if (status === "ready") {
    return (
      <span className={cn("text-ink-tertiary", className)}>
        {sourceStatusLabel(status)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        status === "processing" ? "text-ink-tertiary" : "text-danger",
        className,
      )}
    >
      {status === "processing" ? (
        <CircleDashedIcon className="size-3 animate-spin" aria-hidden="true" />
      ) : (
        <TriangleAlertIcon className="size-3" aria-hidden="true" />
      )}
      {sourceStatusLabel(status)}
    </span>
  );
}

/**
 * Explains a failure, so the status text is never the end of the story.
 */
export function SourceFailureNote({
  document,
  className,
}: {
  document: Pick<DocumentSource, "status">;
  className?: string;
}) {
  if (sourceStatus(document) !== "failed") return null;

  return (
    <p className={cn("text-[0.75rem] leading-relaxed text-danger", className)}>
      Ingestion failed. Remove it and try again.
    </p>
  );
}