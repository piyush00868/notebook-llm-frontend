import { MessagesSquareIcon, RotateCwIcon, SquarePenIcon, Trash2Icon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { sessionLabel } from "@/lib/chatHistory";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/types";

/**
 * Conversation history for a notebook.
 *
 * Sits above the sources list and reads as navigation rather than content: a
 * label with a count, a single "New chat" action, then one compact row per
 * conversation. The list is capped and scrolls internally so a long history
 * cannot push the sources list — and the composer — out of the sidebar.
 *
 * Labels are the chat's first question when known and its date otherwise; see
 * `sessionLabel`. `Chat` has no title column, which is why that fallback
 * exists.
 */
export function ChatHistoryList({
  chats,
  activeChatId,
  isLoading,
  isCreating,
  error,
  deletingChatId,
  onSelect,
  onNewChat,
  onDelete,
  onRetry,
}: {
  chats: ChatSession[];
  activeChatId: number | null;
  isLoading: boolean;
  isCreating: boolean;
  /** Set when the list or an action failed. */
  error?: string | null;
  deletingChatId: number | null;
  onSelect: (chatId: number) => void;
  onNewChat: () => void;
  onDelete: (chatId: number) => void;
  /** Retries a failed list load. */
  onRetry: () => void;
}) {
  return (
    <section aria-label="Conversations" className="flex shrink-0 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2 px-3">
        <h2 className="text-[0.8125rem] font-semibold tracking-[0.01em] text-ink">
          Chats
        </h2>

        {!isLoading ? (
          <span className="text-[0.75rem] tabular-nums text-ink-tertiary">
            {chats.length}
          </span>
        ) : null}

        <button
          type="button"
          onClick={onNewChat}
          disabled={isCreating}
          aria-label="New chat"
          className={cn(
            "ml-auto flex size-7 items-center justify-center rounded-md text-ink-tertiary",
            "transition-colors hover:bg-surface hover:text-ink",
            "focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {isCreating ? (
            <Spinner />
          ) : (
            <SquarePenIcon className="size-3.5" />
          )}
        </button>
      </div>

      <div className="max-h-40 min-h-0 overflow-y-auto overscroll-contain scroll-subtle px-2 pb-2">
        {/*
          The failure is surfaced here rather than as a toast: this panel is
          where the user is looking, and the recovery — "New chat" — sits in
          the header above it.
        */}
        {error ? (
          <div className="px-2 py-1.5">
            <p role="alert" className="text-[0.75rem] leading-relaxed text-danger">
              {error}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className={cn(
                "mt-1.5 inline-flex items-center gap-1.5 rounded-md text-[0.75rem] text-ink-secondary",
                "transition-colors hover:text-ink",
                "focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none",
              )}
            >
              <RotateCwIcon className="size-3" />
              Try again
            </button>
          </div>
        ) : isLoading ? (
          <ChatListSkeleton />
        ) : chats.length === 0 ? (
          <p className="px-2 py-1.5 text-[0.75rem] text-ink-tertiary">
            No conversations yet.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {chats.map((chat) => (
              <ChatRow
                key={chat.id}
                chat={chat}
                active={chat.id === activeChatId}
                isDeleting={chat.id === deletingChatId}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ChatRow({
  chat,
  active,
  isDeleting,
  onSelect,
  onDelete,
}: {
  chat: ChatSession;
  active: boolean;
  isDeleting: boolean;
  onSelect: (chatId: number) => void;
  onDelete: (chatId: number) => void;
}) {
  return (
    <li className="group/row relative">
      <button
        type="button"
        onClick={() => onSelect(chat.id)}
        // `aria-current` marks the open conversation for assistive tech, which
        // a background highlight alone would not convey.
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg py-1.5 pr-8 pl-2 text-left",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
          active
            ? "bg-surface text-ink"
            : "text-ink-secondary hover:bg-surface/60 hover:text-ink",
          isDeleting && "pointer-events-none opacity-50",
        )}
      >
        <MessagesSquareIcon
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0",
            active ? "text-accent" : "text-ink-tertiary",
          )}
        />

        <span className="min-w-0 flex-1 truncate text-[0.8125rem]">
          {isDeleting ? "Deleting…" : sessionLabel(chat)}
        </span>
      </button>

      {/* Kept outside the select button so the two targets never overlap. */}
      <button
        type="button"
        onClick={() => onDelete(chat.id)}
        disabled={isDeleting}
        aria-label={`Delete conversation: ${sessionLabel(chat)}`}
        className={cn(
          "absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-md",
          "text-ink-tertiary transition-colors hover:bg-danger/10 hover:text-danger",
          "focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none",
          "opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        <Trash2Icon className="size-3.5" />
      </button>
    </li>
  );
}

function ChatListSkeleton() {
  return (
    <ul role="status" aria-label="Loading conversations" className="space-y-0.5">
      {Array.from({ length: 3 }).map((_, index) => (
        <li key={index} className="flex items-center gap-2 px-2 py-1.5">
          <Skeleton className="size-3.5 shrink-0 rounded" />
          <Skeleton className="h-3 w-16" />
        </li>
      ))}
      <span className="sr-only">Loading conversations…</span>
    </ul>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}