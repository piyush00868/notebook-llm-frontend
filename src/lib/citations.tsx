import type { ReactNode } from "react";
import { Fragment } from "react";

/**
 * Citation token syntax.
 *
 * The backend's system prompt instructs the model to mark claims with the
 * context block number it used, e.g. `[1]`, `[2][3]`. Numbers are 1-based
 * and refer to positions in the response's `sources` array.
 */
const CITATION_PATTERN = /\[(\d{1,2})\]/g;

export interface CitationSegment {
  kind: "text" | "citation";
  value: string;
  /** 1-based index, matching the backend's `sources[].index`. */
  index?: number;
}

/**
 * Splits message text into plain and citation segments.
 *
 * Exported so the composer and tests can reason about the same grammar the
 * renderer uses. A `[n]` whose index exceeds the number of returned sources
 * is still surfaced as a citation — the model may reference a block the
 * retriever scored highly but the UI did not list — so the viewer can show
 * it as unavailable rather than silently dropping evidence.
 */
export function parseCitations(text: string): CitationSegment[] {
  const segments: CitationSegment[] = [];
  let lastIndex = 0;

  // The pattern is global and stateful; reset before each use.
  CITATION_PATTERN.lastIndex = 0;

  let match = CITATION_PATTERN.exec(text);
  while (match !== null) {
    if (match.index > lastIndex) {
      segments.push({
        kind: "text",
        value: text.slice(lastIndex, match.index),
      });
    }

    segments.push({ kind: "citation", value: match[0], index: Number(match[1]) });

    lastIndex = match.index + match[0].length;
    match = CITATION_PATTERN.exec(text);
  }

  if (lastIndex < text.length) {
    segments.push({ kind: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

/**
 * Renders text with citation markers replaced by interactive chips.
 *
 * Kept separate from the markdown pipeline: the assistant renderer walks
 * the parsed block AST, so citations inside list items, table cells and
 * headings are handled by the same function as those in paragraphs.
 */
export function renderWithCitations(
  text: string,
  renderCitation: (index: number, label: string) => ReactNode,
): ReactNode {
  const segments = parseCitations(text);

  if (segments.length === 0) return null;

  return segments.map((segment, position) =>
    segment.kind === "text" ? (
      <Fragment key={position}>{segment.value}</Fragment>
    ) : (
      <Fragment key={position}>
        {renderCitation(segment.index!, segment.value)}
      </Fragment>
    ),
  );
}