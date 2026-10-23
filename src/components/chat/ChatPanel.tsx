import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RefreshCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { pluralize } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { AssistantMessage, SourceList } from "@/components/chat/AssistantMessage";
import type { Citation } from "@/types";

/**
 * The primary surface of the notebook.
 *
 * The conversation owns the space: there is no page title or header strip
 * here — identity and source count live in the compact app bar — so the
 * thread starts near the top of the remaining height and the composer sits
 * directly beneath it, always visible.
 *
 * Scroll behaviour: the thread sticks to the bottom while the user is already
 * near it, and stops following the moment they scroll up to read something —
 * otherwise a long answer would drag the viewport away.
 */
export function ChatPanel({
  hasSources,
  sourceCount,
  isLoadingSources,
  isLoadingHistory,
  activeChatId,
  disabled,
  disabledReason,
  messages,
  isAsking,
  error,
  onSend,
  onStop,
  onRetry,
  onCitationClick,
}: {
  hasSources: boolean;
  sourceCount: number;
  isLoadingSources: boolean;
  /** True while the active conversation's messages are being restored. */
  isLoadingHistory?: boolean;
  /** Identifies the conversation, used to restore its scroll position. */
  activeChatId?: number | null;
  /**
   * Forces the composer off. Used when there is no conversation to post to,
   * so the field never accepts a question that would silently do nothing.
   */
  disabled?: boolean;
  disabledReason?: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    sources?: Citation[];
    error?: string;
  }>;
  isAsking: boolean;
  error: string | null;
  onSend: (question: string) => void;
  onStop: () => void;
  onRetry: () => void;
  onCitationClick: (citation: Citation) => void;
}) {
  const [draft, setDraft] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  /**
     * Scroll offset per chat.
     *
     * Without this, switching conversations always lands at the bottom, which
     * throws away the reader's place in a long thread. Keyed by chat id so each
     * conversation keeps its own position.
     */
  const scrollPositions = useRef(new Map<number, number>());

  // Normalised once: the prop is optional, the map key is not.
  const chatKey = typeof activeChatId === "number" ? activeChatId : null;

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;

    // Within ~80px of the bottom counts as "following".
    const distance =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    stickToBottomRef.current = distance < 80;

    if (chatKey !== null) {
      scrollPositions.current.set(chatKey, element.scrollTop);
    }
  };

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isAsking]);

  // Restore this conversation's saved position when it becomes active, once
  // its messages have rendered and the scroll height is meaningful.
  useEffect(() => {
    if (chatKey === null || isLoadingHistory) return;

    const element = scrollRef.current;
    if (!element) return;

    const saved = scrollPositions.current.get(chatKey);

    if (saved === undefined) {
      // A chat opened for the first time starts at the newest message.
      stickToBottomRef.current = true;
      bottomRef.current?.scrollIntoView({ block: "end" });
      return;
    }

    element.scrollTop = saved;
    stickToBottomRef.current =
      element.scrollHeight - saved - element.clientHeight < 80;
  }, [chatKey, isLoadingHistory, messages.length]);

  const empty = messages.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-subtle border-t border-line shadow-subtle"
      >
        {empty ? (
          <ChatEmptyState
            hasSources={hasSources}
            sourceCount={sourceCount}
            isLoadingSources={isLoadingSources}
            isLoadingHistory={isLoadingHistory}
            canAsk={!disabled}
            onPick={onSend}
          />
        ) : (
          <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
            <ol className="space-y-7">
              <AnimatePresence initial={false}>
                {messages.map((message) =>
                  message.role === "user" ? (
                    <UserTurn key={message.id} content={message.content} />
                  ) : (
                    <AssistantTurn
                      key={message.id}
                      content={message.content}
                      sources={message.sources}
                      error={message.error}
                      isAsking={isAsking}
                      onCitationClick={onCitationClick}
                      onRetry={onRetry}
                    />
                  ),
                )}
              </AnimatePresence>
            </ol>

            {error && !isAsking ? (
              <p role="alert" className="mt-4 text-[0.8125rem] text-danger">
                {error}
              </p>
            ) : null}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <ChatComposer
        value={draft}
        onValueChange={setDraft}
        onSend={onSend}
        onStop={onStop}
        isBusy={isAsking}
        disabled={
          (disabled ?? false) || (!hasSources && !isLoadingSources)
        }
        disabledReason={
          disabledReason ??
          (isLoadingSources
            ? "Loading sources…"
            : "Add a source to start asking questions. Answers are grounded in your sources.")
        }
      />
    </div>
  );
}

/**
 * User turn.
 *
 * Neutral on purpose. A saturated bubble made the question louder than the
 * answer it was asking about; a quiet neutral surface with a hairline keeps
 * the thread reading as one conversation. Blue is reserved for citations.
 */
function UserTurn({ content }: { content: string }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="flex justify-end"
    >
      <p className="max-w-[85%] rounded-2xl rounded-br-md border border-line bg-tinted px-4 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-ink">
        {content}
      </p>
    </motion.li>
  );
}

/** Assistant turn: avatar-led prose, no bubble. */
function AssistantTurn({
  content,
  sources,
  error,
  isAsking,
  onCitationClick,
  onRetry,
}: {
  content: string;
  sources?: Citation[];
  error?: string;
  isAsking: boolean;
  onCitationClick: (citation: Citation) => void;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <motion.li
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-danger/25 bg-danger/[0.04] p-4"
      >
        <p className="text-[0.8125rem] leading-relaxed text-ink-secondary">
          {error}
        </p>
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
          <RefreshCwIcon />
          Try again
        </Button>
      </motion.li>
    );
  }

  const isPending = isAsking && content.length === 0;

  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-3"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-tinted"
      >
        <span className="size-2.5 rounded-full bg-accent" />
      </span>

      <div className="min-w-0 flex-1">
        {isPending ? (
          <ThinkingIndicator />
        ) : (
          <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-line bg-tinted px-4 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-ink">
            <AssistantMessage
              content={content}
              sources={sources}
              onCitationClick={onCitationClick}
            />
          </div>
        )}

        {sources && sources.length > 0 && !isPending ? (
          <SourceList sources={sources} onSelect={onCitationClick} />
        ) : null}
      </div>
    </motion.li>
  );
}

function ThinkingIndicator() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-[0.875rem] text-ink-tertiary"
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="size-1.5 animate-pulse rounded-full bg-ink-tertiary"
            style={{ animationDelay: `${index * 160}ms` }}
          />
        ))}
      </span>
      Reading your sources
    </div>
  );
}

/**
 * Empty state: the promise, the source count, and three concrete openings.
 */
function ChatEmptyState({
  hasSources,
  sourceCount,
  isLoadingSources,
  isLoadingHistory,
  canAsk,
  onPick,
}: {
  hasSources: boolean;
  sourceCount: number;
  isLoadingSources: boolean;
  isLoadingHistory?: boolean;
  /** False when there is no conversation to post to. */
  canAsk: boolean;
  onPick: (question: string) => void;
}) {
  if (isLoadingSources) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="text-sm text-ink-tertiary">Loading sources…</p>
      </div>
    );
  }

  // A conversation that is being restored has no messages yet, but showing
  // the "ask anything" invitation first would flicker.
  if (isLoadingHistory) {
    return (
      <div
        role="status"
        aria-label="Loading conversation"
        className="flex h-full items-center justify-center px-6"
      >
        <p className="text-sm text-ink-tertiary">Loading conversation…</p>
      </div>
    );
  }

  if (!hasSources) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-12">
        <div className="max-w-sm text-center">
          <h3 className="text-base font-medium text-ink">Add sources to start</h3>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-ink-secondary">
            Add a PDF, website, YouTube video, or text. Every answer is
            grounded only in the sources in this notebook, with citations you
            can check.
          </p>
        </div>
      </div>
    );
  }

  const suggestions = [
    "Summarise the key points",
    "What are the main conclusions?",
    "Explain the most important concepts",
  ];

  return (
    <div className="flex h-full items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <span
          aria-hidden="true"
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-tinted"
        >
          <span className="size-3.5 rounded-full bg-accent" />
        </span>

        <h3 className="mt-5 text-[1.125rem] font-semibold tracking-[-0.025em] text-ink">
          Ask anything about your sources
        </h3>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-secondary">
          {canAsk
            ? `Your answers are grounded in the ${pluralize(sourceCount, "source")} in this notebook.`
            : "Start a new chat from the sidebar to ask a question."}
        </p>

        {/* Suggestions would post to a chat that does not exist yet. */}
        <ul className="mt-6 flex flex-col items-center gap-2">
          {suggestions.map((suggestion) => (
            <li key={suggestion} className="w-full max-w-xs" hidden={!canAsk}>
              <button
                type="button"
                onClick={() => onPick(suggestion)}
                className={cn(
                  "w-full rounded-lg border border-line bg-surface px-4 py-2.5",
                  "text-[0.875rem] text-ink-secondary",
                  // Neutral hover: the border warms toward the accent and the
                  // text darkens, but nothing turns blue.
                  "hover:border-line-strong hover:bg-accent-ui hover:text-ink",
                  "focus-visible:border-accent/45 focus-visible:ring-2 focus-visible:ring-accent/15",
                )}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}