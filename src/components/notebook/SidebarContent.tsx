import { ChatHistoryList } from "@/components/notebook/ChatHistoryList";
import { SourcesPanel } from "@/components/sources/SourcesPanel";
import { cn } from "@/lib/utils";
import type { ChatSession, DocumentSource } from "@/types";

/**
 * The sidebar's contents: conversation history above, sources below.
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
  onAdd: () => void;
  onOpenSource: (document: DocumentSource) => void;
  onDeleteSource: (document: DocumentSource) => void;
  deletingId: number | null;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col bg-sunken", className)}>
      <ChatHistoryList
        chats={chats}
        activeChatId={activeChatId}
        isLoading={isLoadingChats}
        isCreating={isCreatingChat}
        error={chatsError}
        deletingChatId={deletingChatId}
        onSelect={onSelectChat}
        onNewChat={onNewChat}
        onDelete={onDeleteChat}
        onRetry={onRetryChats}
      />

      <div className="min-h-0 flex-1 border-t border-line">
        <SourcesPanel
          documents={documents}
          isLoading={isLoadingSources}
          error={error}
          onAdd={onAdd}
          onOpenSource={onOpenSource}
          onDeleteSource={onDeleteSource}
          deletingId={deletingId}
          // The list header is a divider away, so it needs no top padding.
          className="h-full pt-3"
        />
      </div>
    </div>
  );
}