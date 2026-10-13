import { useMemo } from "react";
import { ExternalLinkIcon, QuoteIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { SourceStatusBadge } from "@/components/sources/SourceStatusBadge";
import { useAsync } from "@/hooks/useAsync";
import { useApi } from "@/lib/api";
import { excerptFor, findChunk } from "@/lib/excerpt";
import { hostnameFromUrl, sourceTypeLabel } from "@/lib/format";
import { renderSourceIcon } from "@/lib/sources";
import { cn } from "@/lib/utils";
import type { Citation } from "@/types";

/**
 * Citation viewer.
 *
 * Shows the exact chunk a citation refers to. `GET /documents/:id` returns the
 * document's `chunks`, so the cited passage is resolved locally by matching
 * `chunkId` — no extra endpoint required.
 */
export function CitationSheet({
  citation,
  open,
  onOpenChange,
  onViewFull,
}: {
  citation: Citation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewFull: () => void;
}) {
  const api = useApi();
  const documentId = citation?.documentId ?? null;
  const chunkId = citation?.chunkId ?? null;

  const {
    data: document,
    isLoading,
    error,
  } = useAsync(
    open && documentId && documentId > 0 ? `document:${documentId}` : null,
    (signal) => api.getDocument(documentId!, signal),
    { errorMessage: "We could not load this passage." },
  );

  const chunk = useMemo(
    () => findChunk(document?.chunks, chunkId ?? -1),
    [document?.chunks, chunkId],
  );

  const excerpt = useMemo(
    () => excerptFor(document, chunk, 1200, document?.chunks),
    [document, chunk],
  );

  if (!citation) return null;

  // A citation the retriever did not return cannot be resolved.
  const isUnavailable = documentId === 0 || documentId == null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0",
          "inset-x-0 top-0 bottom-0 h-[calc(100dvh-1.5rem)] max-h-[calc(100dvh-1.5rem)] w-full rounded-t-lg",
          // `!` is required: the primitive sets
          // `data-[side=right]:sm:max-w-sm`, whose attribute selector has
          // higher specificity than a bare `sm:max-w-*` override.
          "sm:inset-x-auto sm:right-0 sm:h-auto sm:max-h-[min(85dvh,46rem)] sm:!max-w-lg sm:rounded-none",
        )}
      >
        <SheetHeader className="shrink-0 gap-1 border-b border-line px-5 py-4 pr-14">
          <SheetTitle className="text-[0.9375rem] leading-snug font-medium">
            {isUnavailable ? "Cited source" : citation.documentTitle}
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem]">
            <span>Passage {citation.chunkIndex + 1}</span>
            {document ? (
              <>
                <SourceStatusBadge document={document} />
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  {renderSourceIcon(document.sourceType, "size-3")}
                  {sourceTypeLabel(document.sourceType)}
                </span>
                {document.sourceUrl ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="min-w-0 truncate">
                      {hostnameFromUrl(document.sourceUrl)}
                    </span>
                  </>
                ) : null}
              </>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-subtle px-5 py-4">
          {isUnavailable ? (
            <UnavailablePassage />
          ) : isLoading ? (
            <div role="status" aria-label="Loading passage" className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-3.5"
                  style={{ width: `${94 - (index % 4) * 12}%` }}
                />
              ))}
            </div>
          ) : error ? (
            <ErrorState compact title="Could not load passage" message={error} />
          ) : excerpt ? (
            <PassageBody excerpt={excerpt} />
          ) : (
            <p className="text-[0.8125rem] leading-relaxed text-ink-tertiary">
              This passage is no longer stored with the source.
            </p>
          )}
        </div>

        {!isUnavailable ? (
          <div className="shrink-0 border-t border-line px-5 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="sm" onClick={onViewFull}>
                View full source
              </Button>

              {document?.sourceUrl ? (
                <Button
                  variant="ghost"
                  size="sm"
                  // The rendered element is an anchor, not a button.
                  nativeButton={false}
                  render={
                    <a
                      href={document.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <ExternalLinkIcon />
                  Open original
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

/**
 * The cited passage, in its own reading surface.
 *
 * Capped height with internal scroll so a long chunk cannot push the sheet
 * header or footer out of view.
 */
function PassageBody({ excerpt }: { excerpt: string }) {
  return (
    <figure className="space-y-3">
      <blockquote
        id="citation-passage"
        className={cn(
          "max-h-[min(50dvh,26rem)] overflow-y-auto overscroll-contain scroll-subtle",
          "rounded-lg border-l-2 border-accent bg-accent-soft px-3.5 py-3",
          "whitespace-pre-wrap text-[0.875rem] leading-[1.7] wrap-anywhere text-ink",
        )}
      >
        {excerpt}
      </blockquote>

      <figcaption className="flex items-center gap-1.5 text-[0.75rem] text-ink-tertiary">
        <QuoteIcon className="size-3" />
        Cited passage from the stored extraction
      </figcaption>
    </figure>
  );
}

function UnavailablePassage() {
  return (
    <div className="space-y-2">
      <p className="text-[0.8125rem] leading-relaxed text-ink-secondary">
        The model referenced a passage the retriever did not return, so it
        cannot be shown here.
      </p>
      <p className="text-[0.8125rem] leading-relaxed text-ink-tertiary">
        This can happen when the cited block falls outside the returned top-k
        results.
      </p>
    </div>
  );
}