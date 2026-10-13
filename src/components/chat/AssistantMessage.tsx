import { Fragment } from "react";
import { QuoteIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { renderWithCitations } from "@/lib/citations";
import type { Citation } from "@/types";

/**
 * Inline citation chip.
 *
 * Rendered inside assistant prose. Deliberately a real `<button>` so it is
 * reachable by keyboard and announced as interactive.
 */
export function CitationChip({
  citation,
  onSelect,
}: {
  citation: Citation;
  onSelect: (citation: Citation) => void;
}) {
  const label = `Source ${citation.index}: ${citation.documentTitle}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(citation)}
      title={label}
      aria-label={`Open citation: ${label}`}
      className={cn(
        "mx-0.5 inline-flex h-[1.15em] min-w-[1.15em] -translate-y-[0.1em] items-center justify-center",
        "rounded-[4px] bg-accent-soft px-[0.3em]",
        "font-mono text-[0.72em] font-medium leading-none text-accent",
        "transition-colors hover:bg-accent hover:text-accent-fg",
        "focus-visible:ring-2 focus-visible:ring-accent/30",
      )}
    >
      {citation.index}
    </button>
  );
}

/**
 * Assistant answer.
 *
 * The model returns markdown-ish text with inline `[n]` citations. Blocks
 * are parsed minimally here — headings, lists, fenced and inline code,
 * blockquotes and paragraphs — which covers the shapes its system prompt
 * asks for. Every text node is passed through the citation renderer, so
 * markers inside list items and headings stay clickable.
 */
export function AssistantMessage({
  content,
  sources,
  onCitationClick,
  isStreaming,
}: {
  content: string;
  sources?: Citation[];
  onCitationClick: (citation: Citation) => void;
  isStreaming?: boolean;
}) {
  /**
   * Citations with no matching source still need to be clickable, so the
   * user sees an explanation rather than a dead token. `documentId: 0` is
   * the sentinel the viewer treats as "not retrievable".
   */
  const resolve = (index: number): Citation =>
    sources?.find((source) => source.index === index) ?? {
      index,
      documentId: 0,
      documentTitle: "Unavailable passage",
      chunkId: 0,
      chunkIndex: index - 1,
    };

  return (
    <div className="prose-answer">
      <MarkdownBlocks
        content={content}
        renderCitation={(index) => (
          <CitationChip citation={resolve(index)} onSelect={onCitationClick} />
        )}
      />

      {isStreaming ? (
        <span className="mt-1 inline-flex items-center gap-2 text-[0.8125rem] text-ink-tertiary">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" />
          Reading your sources
        </span>
      ) : null}
    </div>
  );
}

/** Minimal block-level markdown parser. */
function MarkdownBlocks({
  content,
  renderCitation,
}: {
  content: string;
  renderCitation: (index: number) => React.ReactNode;
}) {
  const blocks = content.split(/\n{2,}/);

  return blocks.map((block, blockIndex) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // Fenced code
    if (trimmed.startsWith("```")) {
      const lines = trimmed.split("\n");
      const language = lines[0]?.replace(/^```\w*/, "").trim();
      const body = lines.slice(1, lines[lines.length - 1]?.trim().endsWith("```") ? -1 : undefined).join("\n");

      return (
        <pre key={blockIndex}>
          {language ? <span className="sr-only">{language}</span> : null}
          <code>{body}</code>
        </pre>
      );
    }

    // Heading
    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1]!.length;
      const Tag = (["h1", "h2", "h3", "h4"] as const)[level - 1]!;
      return (
        <Tag key={blockIndex}>
          <Inline text={heading[2]!} renderCitation={renderCitation} />
        </Tag>
      );
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      return <hr key={blockIndex} />;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      const body = trimmed.replace(/^>\s?/gm, "");
      return (
        <blockquote key={blockIndex}>
          <Inline text={body} renderCitation={renderCitation} />
        </blockquote>
      );
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(trimmed)) {
      const items = trimmed.split("\n").filter((line) => line.trim());
      return (
        <ul key={blockIndex}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>
              <Inline
                text={item.replace(/^\s*[-*+]\s+/, "")}
                renderCitation={renderCitation}
              />
            </li>
          ))}
        </ul>
      );
    }

    // Ordered list
    if (/^\s*\d+[.)]\s+/.test(trimmed)) {
      const items = trimmed.split("\n").filter((line) => line.trim());
      return (
        <ol key={blockIndex}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>
              <Inline
                text={item.replace(/^\s*\d+[.)]\s+/, "")}
                renderCitation={renderCitation}
              />
            </li>
          ))}
        </ol>
      );
    }

    // Paragraph
    return (
      <p key={blockIndex}>
        <Inline text={trimmed} renderCitation={renderCitation} />
      </p>
    );
  });
}

/**
 * Inline content: code spans first (so citations inside code stay literal),
 * then emphasis, then citation-aware text.
 */
function Inline({
  text,
  renderCitation,
}: {
  text: string;
  renderCitation: (index: number) => React.ReactNode;
}) {
  const codePattern = /`([^`]+)`/;
  const codeMatch = codePattern.exec(text);

  if (codeMatch) {
    const [full, body] = codeMatch;
    return (
      <>
        <Text text={text.slice(0, codeMatch.index)} renderCitation={renderCitation} />
        <code>{body}</code>
        <Text
          text={text.slice(codeMatch.index + full.length)}
          renderCitation={renderCitation}
        />
      </>
    );
  }

  return <Text text={text} renderCitation={renderCitation} />;
}

/** Text with emphasis, links and citation markers resolved. */
function Text({
  text,
  renderCitation,
}: {
  text: string;
  renderCitation: (index: number) => React.ReactNode;
}) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);

  return parts.map((part, index) => {
    if (!part) return null;

    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) {
      return (
        <strong key={index}>
          <Text text={bold[1]!} renderCitation={renderCitation} />
        </strong>
      );
    }

    const italic = /^\*([^*]+)\*$/.exec(part);
    if (italic) {
      return (
        <em key={index}>
          <Text text={italic[1]!} renderCitation={renderCitation} />
        </em>
      );
    }

    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      return (
        <a
          key={index}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
        >
          {link[1]}
        </a>
      );
    }

    return (
      <Fragment key={index}>
        {renderWithCitations(part, renderCitation)}
      </Fragment>
    );
  });
}

/** "Sources" list rendered beneath an answer. */
/**
 * Sources list beneath an answer.
 *
 * Titles repeat when several chunks come from one document, so each row
 * shows its passage number and, where available, the relevance score — that
 * is what distinguishes the citations at a glance.
 */
export function SourceList({
  sources,
  onSelect,
}: {
  sources: Citation[];
  onSelect: (citation: Citation) => void;
}) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-6 border-t border-line pt-4">
      <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-tertiary">
        Sources
      </h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {sources.map((source) => (
          <li key={`${source.documentId}-${source.chunkId}`}>
            <button
              type="button"
              onClick={() => onSelect(source)}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-sunken px-2.5 py-1.5",
                "text-[0.8125rem] text-ink-secondary",
                "transition-colors hover:border-accent-border hover:bg-accent-soft hover:text-ink",
                "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25",
              )}
            >
              <span
                aria-hidden="true"
                className="flex size-4 shrink-0 items-center justify-center rounded-[4px] bg-accent-soft font-mono text-[0.625rem] font-medium text-accent"
              >
                {source.index}
              </span>
              <span className="truncate">{source.documentTitle}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Relevance score row shown under the Sources list. */
export function RelevanceNote({ source }: { source: Citation }) {
  return (
    <li className="flex items-center gap-1.5 text-[0.75rem] text-ink-tertiary">
      <QuoteIcon className="size-3" />
      {source.score != null
        ? `Relevance ${source.score.toFixed(3)}`
        : "Retrieved passage"}
    </li>
  );
}