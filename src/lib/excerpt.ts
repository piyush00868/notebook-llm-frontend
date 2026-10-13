import type { DocumentChunk, DocumentSource } from "@/types";

export interface ExcerptRange {
  start: number;
  end: number;
}

/**
 * Locates a chunk's text inside its source document.
 *
 * Chunking writes contiguous slices of the normalised document, so a chunk's
 * content appears verbatim in `document.content`. Finding its offset lets the
 * viewer highlight the exact passage a citation refers to instead of dumping
 * the whole source.
 *
 * Returns `null` when the chunk cannot be placed — a document with no stored
 * text, or content that has since changed. Callers should degrade to showing
 * the document rather than highlighting the wrong region.
 */
export function locateChunk(
  document: Pick<DocumentSource, "content"> | null,
  chunk: DocumentChunk | null | undefined,
): ExcerptRange | null {
  if (!document?.content || !chunk?.content) return null;

  const haystack = document.content;
  const needle = chunk.content;

  // Cheap length guard: a needle longer than the haystack cannot be inside it.
  if (needle.length === 0 || needle.length > haystack.length) return null;

  let start = haystack.indexOf(needle);

  if (start === -1) {
    // Whitespace normalisation can differ slightly between the stored chunk
    // and the document body. Retry on a normalised comparison rather than
    // guessing an offset that would highlight the wrong passage.
    start = indexOfLoose(haystack, needle);
    if (start === -1) return null;
  }

  return { start, end: start + needle.length };
}

/**
 * Fallback match that collapses whitespace on both sides.
 *
 * Returns the offset into the *original* haystack so the caller can still
 * slice it.
 */
function indexOfLoose(haystack: string, needle: string): number {
  const normalise = (value: string) => value.replace(/\s+/g, " ").trim();

  const target = normalise(needle);
  if (!target) return -1;

  let hay = "";
  const offsets: number[] = [];

  for (let index = 0; index < haystack.length; index += 1) {
    const char = haystack[index]!;
    if (/\s/.test(char)) {
      // Collapse runs of whitespace to a single space.
      if (hay.length === 0 || hay.endsWith(" ")) continue;
      hay += " ";
      offsets.push(index);
      continue;
    }
    hay += char;
    offsets.push(index);
  }

  const position = hay.indexOf(target);
  if (position === -1) return -1;

  const startOriginal = offsets[position];
  if (startOriginal === undefined) return -1;

  // Only the start offset is needed; the caller slices by chunk length.
  return startOriginal;
}

/** Finds the chunk matching a citation's `chunkId`. */
export function findChunk(
  chunks: DocumentChunk[] | null | undefined,
  chunkId: number,
): DocumentChunk | null {
  if (!chunks || !Array.isArray(chunks)) return null;
  return chunks.find((chunk) => chunk.id === chunkId) ?? null;
}

/**
 * Locates a chunk by walking the document's chunks in order.
 *
 * `locateChunk` on its own finds the *first* occurrence of a chunk's text,
 * which is wrong for a document that repeats itself — a boilerplate header, a
 * repeated table row or a licence block appears more than once, and a plain
 * search would highlight the earlier copy rather than the passage actually
 * cited.
 *
 * Chunking writes contiguous slices of the document, so chunk *n* starts where
 * chunk *n-1* ended. Placing chunks in `chunkIndex` order and only searching
 * forward from the previous chunk's offset removes the ambiguity. Each chunk is
 * still resolved individually so one unplaceable chunk does not shift the rest.
 *
 * Returns `null` when the chunk cannot be placed; callers fall back to showing
 * the document rather than highlighting the wrong region.
 */
export function locateChunkInOrder(
  document: Pick<DocumentSource, "content"> | null,
  chunks: DocumentChunk[] | null | undefined,
  chunkId: number,
): ExcerptRange | null {
  const target = findChunk(chunks, chunkId);
  if (!target) return null;

  const fallback = locateChunk(document, target);
  if (!document?.content) return fallback;

  // Ordered by position in the document, not by row id.
  const ordered = [...chunks!]
    .filter((chunk): chunk is DocumentChunk => chunk != null)
    .sort((a, b) => a.chunkIndex - b.chunkIndex);

  const targetIndex = ordered.findIndex((chunk) => chunk.id === target.id);
  if (targetIndex === -1) return fallback;

  let cursor = 0;

  for (const chunk of ordered.slice(0, targetIndex)) {
    const found = locateChunk(document, chunk);

    // Advance only past chunks that were placed; otherwise the search window
    // would jump somewhere arbitrary.
    if (found) cursor = Math.max(cursor, found.start + 1);
  }

  const needle = target.content;
  const haystack = document.content;
  if (!needle || needle.length > haystack.length) return fallback;

  const foundAtCursor = haystack.indexOf(needle, cursor);
  if (foundAtCursor !== -1) {
    return { start: foundAtCursor, end: foundAtCursor + needle.length };
  }

  return fallback;
}

/** Builds the excerpt text for a citation, or `null` if unavailable. */
export function excerptFor(
  document: Pick<DocumentSource, "content"> | null,
  chunk: DocumentChunk | null | undefined,
  limit = 1200,
  /**
   * The document's full chunk list. When supplied, the chunk is placed by
   * walking the document in order, which resolves a passage that appears more
   * than once to the correct occurrence.
   */
  allChunks?: DocumentChunk[] | null,
): string | null {
  if (!chunk?.content) return null;

  if (!document?.content) {
    return truncate(chunk.content, limit);
  }

  const range = allChunks
    ? locateChunkInOrder(document, allChunks, chunk.id)
    : locateChunk(document, chunk);

  if (!range) return truncate(chunk.content, limit);

  return truncate(document.content.slice(range.start, range.end), limit);
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit).trimEnd()}…`;
}