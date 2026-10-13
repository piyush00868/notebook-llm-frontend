import { MessagesSquareIcon, RotateCwIcon, SearchIcon, SquarePenIcon, Trash2Icon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { groupSessions, sessionLabel } from "@/lib/chatHistory";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/types";

/**
 * Conversation history for a notebook.
 *
 * Chats are the sidebar's primary navigation, so this section takes the
 * flexible space and the sources list below it is the part that gives way.
 * Order of importance: the one action that matters most, a filter, then
 * conversations bucketed by recency so a long history stays scannable.
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
  query,
  onQueryChange,
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
  /** Current filter text; empty means show everything. */
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (chatId: number) => void;
  onNewChat: () => void;
  onDelete: (chatId: number) => void;
  /** Retries a failed list load. */
  onRetry: () => void;
}) {
  const trimmed = query.trim();

  const visible = trimmed
    ? chats.filter((chat) =>
        sessionLabel(chat).toLowerCase().includes(trimmed.toLowerCase()),
      )
    : chats;

  // Grouping is derived during render: no effect, and it cannot drift out of
  // sync with whatever the filter produced above.
  const groups = groupSessions(visible);

  return (
    <section aria-label="Conversations" className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={onNewChat}
          disabled={isCreating}
          className={cn(
            "flex h-9 w-full items-center justify-center gap-2 rounded-lg",
            "bg-accent text-[0.8125rem] font-medium text-white",
            "transition-colors hover:bg-accent-hover",
            "focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-60",
          )}
        >
          {isCreating ? (
            <Spinner />
          ) : (
            <SquarePenIcon className="size-4" />
          )}
          New chat
        </button>

        <div className="relative mt-2">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-tertiary"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className={cn(
              "h-8 w-full rounded-lg border border-line bg-surface pr-2 pl-8",
              "text-[0.8125rem] text-ink placeholder:text-ink-tertiary",
              "transition-colors outline-none hover:border-line-strong",
              "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25",
            )}
          />
        </div>
      </div>

      <div className="flex h-7 shrink-0 items-center gap-2 px-3">
        <h2 className="text-[0.8125rem] font-semibold tracking-[0.01em] text-ink">
          Chats
        </h2>

        {!isLoading ? (
          <span className="text-[0.75rem] tabular-nums text-ink-tertiary">
            {trimmed ? visible.length : chats.length}
          </span>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-subtle px-2 pb-2">
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
        ) : groups.length === 0 ? (
          <p className="px-2 py-1.5 text-[0.75rem] text-ink-tertiary">
            No conversations match &ldquo;{trimmed}&rdquo;.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.key} className="mb-1">
              <h3 className="px-2 pt-2 pb-1 text-[0.6875rem] font-medium tracking-[0.04em] text-ink-tertiary uppercase">
                {group.label}
              </h3>
              <ul className="space-y-0.5">
                {group.sessions.map((chat) => (
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
            </div>
          ))
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