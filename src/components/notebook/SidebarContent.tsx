import { useCallback, useState } from "react";
import { ChatHistoryList } from "@/components/notebook/ChatHistoryList";
import { SourcesPanel } from "@/components/sources/SourcesPanel";
import { cn } from "@/lib/utils";
import type { ChatSession, DocumentSource } from "@/types";

/**
 * The sidebar's contents: conversation history above, sources below.
 *
 * Chats take the flexible space and sources are capped, because chats are the
 * primary navigation and sources are context. Expanding sources takes its room
 * back out of the chat list rather than pushing it out of the sidebar.
 *
 * One component serves both hosts — the persistent desktop sidebar and the
 * mobile sheet — so the two can never drift apart.
 */
export function SidebarContent({
  chats,
  activeChatId,
  isLoadingChats,
  isCreatingChat,
  chatsError,
  deletingChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRetryChats,
  documents,
  isLoadingSources,
  error,
  isSourcesExpanded,
  onToggleSources,
  onAdd,
  onOpenSource,
  onDeleteSource,
  deletingId,
  className,
}: {
  chats: ChatSession[];
  activeChatId: number | null;
  isLoadingChats: boolean;
  isCreatingChat: boolean;
  chatsError: string | null;
  deletingChatId: number | null;
  onSelectChat: (chatId: number) => void;
  onNewChat: () => void;
  onDeleteChat: (chatId: number) => void;
  onRetryChats: () => void;
  documents: DocumentSource[];
  isLoadingSources: boolean;
  error: string | null;
  isSourcesExpanded: boolean;
  onToggleSources: () => void;
  onAdd: () => void;
  onOpenSource: (document: DocumentSource) => void;
  onDeleteSource: (document: DocumentSource) => void;
  deletingId: number | null;
  className?: string;
}) {
  // Search state lives here because the filter is a view concern: it must reset
  // when the host unmounts, and keeping it out of the data hooks avoids
  // re-fetching anything when the user types.
  const [chatQuery, setChatQuery] = useState("");

  // A filter would hide the conversation just created, which reads as
  // "New chat did nothing". Clear it so the new chat is always visible.
  const handleNewChat = useCallback(() => {
    setChatQuery("");
    onNewChat();
  }, [onNewChat]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col bg-sunken", className)}>
      <ChatHistoryList
        chats={chats}
        activeChatId={activeChatId}
        isLoading={isLoadingChats}
        isCreating={isCreatingChat}
        error={chatsError}
        deletingChatId={deletingChatId}
        query={chatQuery}
        onQueryChange={setChatQuery}
        onSelect={onSelectChat}
        onNewChat={handleNewChat}
        onDelete={onDeleteChat}
        onRetry={onRetryChats}
      />

      {/*
        `shrink-0` with a flex-basis rather than a max-height: the expanded
        state needs a *definite* height for the inner scroller to resolve, and
        only basis provides one. The chat section above is `flex-1` (basis 0),
        so it absorbs whatever is left — which is the point: expanding sources
        takes its space out of the chat list instead of overflowing the sidebar.
      */}
      <div
        className={cn(
          "flex min-h-0 shrink-0 flex-col border-t border-line",
          isSourcesExpanded && "basis-[55%]",
        )}
      >
        <SourcesPanel
          documents={documents}
          isLoading={isLoadingSources}
          error={error}
          isExpanded={isSourcesExpanded}
          onToggle={onToggleSources}
          onAdd={onAdd}
          onOpenSource={onOpenSource}
          onDeleteSource={onDeleteSource}
          deletingId={deletingId}
          className="min-h-0 flex-1"
        />
      </div>
    </div>
  );
}