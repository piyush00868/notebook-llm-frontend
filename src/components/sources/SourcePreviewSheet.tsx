import { useEffect, useMemo, useRef } from "react";
import { ExternalLinkIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/layout/ErrorState";
import { SourceStatusBadge } from "@/components/sources/SourceStatusBadge";
import { useAsync } from "@/hooks/useAsync";
import { useApi } from "@/lib/api";
import { findChunk, locateChunkInOrder } from "@/lib/excerpt";
import { hostnameFromUrl, sourceTypeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Citation, DocumentSource } from "@/types";

/**
 * Source reader with citation highlighting.
 *
 * The whole document is rendered, but the cited chunk is marked inline so the
 * supporting passage is locatable in context rather than shown in isolation.
 *
 * Containment is explicit: a `dvh`-capped panel, pinned header and footer, and
 * a single scrolling body. Height never depends on content length.
 */
export function SourcePreviewSheet({
  document,
  open,
  onOpenChange,
  /** Citation that opened this reader, if any. */
  citation,
}: {
  document: DocumentSource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  citation?: Citation | null;
}) {
  const api = useApi();
  const documentId = document?.id ?? null;

  const {
    data: detail,
    error,
    isLoading,
  } = useAsync(
    open && documentId ? `document:${documentId}` : null,
    (signal) => api.getDocument(documentId!, signal),
    { errorMessage: "We could not load this source." },
  );

  const text = detail?.content?.trim();

  // Resolve the cited range once per document/citation pair.
  const highlight = useMemo(() => {
    if (!citation) return null;
    const chunk = findChunk(detail?.chunks, citation.chunkId);
    if (!chunk) return null;
    // Ordered placement, so a passage that repeats in the document highlights
    // the occurrence actually cited rather than the first one.
    return locateChunkInOrder(detail, detail?.chunks, citation.chunkId);
  }, [citation, detail]);

  // Scoped per document so re-opening with a different citation still matches.
  const highlightId = highlight ? `cited-passage-${documentId}` : null;

  const bodyRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLElement>(null);

  // Bring the cited passage into view once the highlight exists.
  useEffect(() => {
    if (!highlightId) return;

    // Wait a frame so the panel has been laid out before measuring.
    const frame = requestAnimationFrame(() => {
      const body = bodyRef.current;
      const mark = markRef.current;
      if (!body || !mark) return;

      // Centre the passage inside the scroll container.
      const target = mark.offsetTop - body.clientHeight / 2 + mark.offsetHeight / 2;
      body.scrollTop = Math.max(0, target);
    });

    return () => cancelAnimationFrame(frame);
  }, [highlightId, open]);

  if (!document) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex flex-col gap-0 overflow-hidden border-line bg-surface p-0",
          // Mobile: almost the full viewport.
          "inset-x-0 top-0 bottom-0 h-[calc(100dvh-1.5rem)] max-h-[calc(100dvh-1.5rem)] w-full rounded-t-xl",
          // Desktop: a tall, bounded side panel.
          // `!` is required: the primitive sets
          // `data-[side=right]:sm:max-w-sm`, whose attribute selector has
          // higher specificity than a bare `sm:max-w-*` override.
          "sm:inset-x-auto sm:right-0 sm:h-auto sm:max-h-[min(85dvh,46rem)] sm:!max-w-xl sm:rounded-none",
        )}
      >
        <SheetHeader className="shrink-0 gap-1 border-b border-line px-5 py-4 pr-14">
          <SheetTitle className="text-[0.9375rem] leading-snug font-medium">
            {document.title}
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem]">
            <span>{sourceTypeLabel(document.sourceType)}</span>
            <SourceStatusBadge document={document} />
            {document.sourceUrl ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="min-w-0 truncate">
                  {hostnameFromUrl(document.sourceUrl)}
                </span>
              </>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        {/*
          The single scroll container. `overscroll-contain` stops the gesture
          chaining to the notebook behind it. When a citation is in play the
          body scrolls itself to the cited passage on open — a highlight the
          user has to hunt for is not much of a highlight.
        */}
        <div
          ref={bodyRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-subtle px-5 py-4"
        >
          {citation ? (
            <p className="mb-4 rounded-lg border border-accent-border bg-accent-soft px-3 py-2 text-[0.75rem] font-medium text-accent">
              Cited passage · chunk {citation.chunkIndex + 1}
            </p>
          ) : null}

          {isLoading ? (
            <LoadingBody />
          ) : error ? (
            <ErrorState compact title="Could not load source" message={error} />
          ) : text ? (
            <DocumentBody
              text={text}
              highlight={highlight}
              highlightId={highlightId}
              hasChunks={Boolean(detail?.chunks?.length)}
              markRef={markRef}
            />
          ) : (
            <p className="text-[0.8125rem] leading-relaxed text-ink-tertiary">
              No extracted text is stored for this source. It may still be
              processing.
            </p>
          )}
        </div>

        <SheetFooter className="shrink-0 border-t border-line px-5 py-3">
          <div className="flex items-center gap-3">
            {document.sourceUrl ? (
              <Button
                variant="outline"
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
            ) : (
              <p className="text-[0.75rem] text-ink-tertiary">
                Extracted text, as stored for this source.
              </p>
            )}

            {text ? (
              <>
                <Separator orientation="vertical" className="h-4" />
                <p className="text-[0.75rem] tabular-nums text-ink-tertiary">
                  {formatLength(text.length)}
                </p>
              </>
            ) : null}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/**
 * The document body.
 *
 * Rendered as a single pre-wrapped block rather than split paragraphs, because
 * citation highlighting works on exact character offsets. Splitting would
 * break the mapping between the stored chunk text and the rendered DOM.
 */
function DocumentBody({
  text,
  highlight,
  highlightId,
  hasChunks,
  markRef,
}: {
  text: string;
  highlight: { start: number; end: number } | null;
  highlightId: string | null;
  hasChunks: boolean;
  markRef: React.RefObject<HTMLElement | null>;
}) {
  if (!highlight) {
    return (
      <p className="mx-auto max-w-[68ch] whitespace-pre-wrap text-[0.875rem] leading-[1.75] wrap-anywhere text-ink-secondary">
        {text}
      </p>
    );
  }

  const before = text.slice(0, highlight.start);
  const cited = text.slice(highlight.start, highlight.end);
  const after = text.slice(highlight.end);

  return (
    <div className="mx-auto max-w-[68ch]">
      {before ? (
        <p className="whitespace-pre-wrap text-[0.875rem] leading-[1.75] wrap-anywhere text-ink-secondary">
          {before}
        </p>
      ) : null}

      <mark
        id={highlightId ?? undefined}
        ref={markRef}
        className={cn(
          "block -mx-2 rounded-md border-l-2 border-accent bg-accent-soft px-3 py-2",
          "whitespace-pre-wrap text-[0.875rem] leading-[1.75] wrap-anywhere text-ink",
        )}
      >
        {cited}
      </mark>

      {after ? (
        <p className="mt-2 whitespace-pre-wrap text-[0.875rem] leading-[1.75] wrap-anywhere text-ink-secondary">
          {after}
        </p>
      ) : null}

      <p className="mt-4 text-[0.75rem] text-ink-tertiary">
        {hasChunks
          ? "Highlighted text is the passage that supported the answer."
          : "Highlighted text is the cited passage."}
      </p>
    </div>
  );
}

function LoadingBody() {
  return (
    <div role="status" aria-label="Loading source text" className="space-y-2.5">
      {Array.from({ length: 10 }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-3.5"
          style={{ width: `${92 - (index % 4) * 13}%` }}
        />
      ))}
    </div>
  );
}

/** "820 words" / "24k characters" — a light sense of document size. */
function formatLength(characters: number): string {
  if (characters < 1000) return `${characters} chars`;

  const words = Math.round(characters / 5.5);
  if (characters < 10_000) return `~${words} words`;

  return `~${Math.round(words / 1000)}k words`;
}