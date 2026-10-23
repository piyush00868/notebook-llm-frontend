import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  NotebookTopBar,
  SidebarBrand,
} from "@/components/notebook/NotebookChrome";
import { SourcesRail } from "@/components/notebook/SourcesRail";
import { SidebarContent } from "@/components/notebook/SidebarContent";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { CitationSheet } from "@/components/chat/CitationSheet";
import { AddSourceDialog } from "@/components/sources/AddSourceDialog";
import { SourcePreviewSheet } from "@/components/sources/SourcePreviewSheet";
import { ErrorState } from "@/components/layout/ErrorState";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useNotebook } from "@/hooks/useNotebook";
import { useChat } from "@/hooks/useChat";
import { useChats } from "@/hooks/useChats";
import { useSourcesPanel } from "@/hooks/useSourcesPanel";
import { useSourcesExpanded } from "@/hooks/useSourcesExpanded";
import { ConfirmDialog, type ConfirmRequest } from "@/components/layout/ConfirmDialog";
import { cn } from "@/lib/utils";
import type { Citation, DocumentSource } from "@/types";

export default function NotebookPage() {
  const params = useParams<{ id: string }>();
  const notebookId = params.id ? Number(params.id) : null;

  const validId = Number.isInteger(notebookId) && notebookId! > 0;
  const {
    notebook,
    documents,
    isInitialLoading,
    error,
    addSource,
    removeSource,
  } = useNotebook(validId ? notebookId : null);

  const chats = useChats(validId ? notebookId : null);
  const chat = useChat(chats.activeChatId);
  const sourcesPanel = useSourcesPanel();
  const sourcesExpanded = useSourcesExpanded();

  const [isAddOpen, setAddOpen] = useState(false);
  const [isMobileSourcesOpen, setMobileSourcesOpen] = useState(false);
  const [preview, setPreview] = useState<{
    document: DocumentSource;
    citation?: Citation;
  } | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const handleAdd = useCallback(
    async (input: Parameters<typeof addSource>[0]) => {
      await addSource(input);
      toast.success("Source added", {
        description: "It is being indexed and will be searchable shortly.",
      });
    },
    [addSource],
  );

  const handleDeleteRequest = useCallback(
    (document: DocumentSource) => {
      setConfirm({
        title: "Remove this source?",
        description: `“${document.title}” and everything indexed from it will be deleted. Questions will no longer be able to cite it.`,
        confirmLabel: "Remove source",
        onConfirm: async () => {
          setDeletingId(document.id);
          try {
            await removeSource(document.id);
            setPreview((current) =>
              current?.document.id === document.id ? null : current,
            );
            setActiveCitation((current) =>
              current?.documentId === document.id ? null : current,
            );
            toast.success("Source removed");
          } finally {
            setDeletingId(null);
          }
        },
      });
    },
    [removeSource],
  );

  /**
   * Opens the full reader for a citation's source, carrying the citation so
   * the reader can highlight the exact supporting passage.
   */
  const handleViewFullFromCitation = useCallback(() => {
    const citation = activeCitation;
    if (!citation || !citation.documentId) return;

    const match = documents.find((doc) => doc.id === citation.documentId);
    if (!match) return;

    setActiveCitation(null);
    setPreview({ document: match, citation });
  }, [activeCitation, documents]);

  const handleNewChat = useCallback(async () => {
    const created = await chats.newChat();

    if (created === null) {
      // The hook already holds the reason; surface it where the user is.
      toast.error("Could not start a new chat", {
        description: chats.error ?? "Please try again.",
      });
      return;
    }

    // Selecting the new chat swaps the visible thread, so close any citation
    // or source viewer that belonged to the previous conversation.
    setActiveCitation(null);
    setPreview(null);
    toast.success("New chat started");
  }, [chats]);

  // ⌘B / Ctrl+B toggles the sidebar, ⌘⇧O / Ctrl+Shift+O starts a new chat.
  // Both ignore key events originating in a text field.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier) return;

      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA";

      if (isTyping) return;

      const key = event.key.toLowerCase();

      if (key === "b") {
        event.preventDefault();
        sourcesPanel.toggle();
        return;
      }

      if (key === "o" && event.shiftKey) {
        event.preventDefault();
        void handleNewChat();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sourcesPanel, handleNewChat]);

  const handleDeleteChatRequest = useCallback(
    (chatId: number) => {
      setConfirm({
        title: "Delete this chat?",
        description:
          "The conversation and its citations will be permanently deleted. Your sources are not affected.",
        confirmLabel: "Delete chat",
        onConfirm: async () => {
          const ok = await chats.deleteChat(chatId);

          if (!ok) {
            toast.error("Could not delete that chat", {
              description: chats.error ?? "Please try again.",
            });
            return;
          }

          // The viewer may be showing a citation from the deleted chat.
          setActiveCitation(null);
          setPreview(null);
          toast.success("Chat deleted");
        },
      });
    },
    [chats],
  );

  if (!validId) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-paper p-6">
        <ErrorState
          title="Invalid notebook"
          message="That notebook link is not valid."
        />
      </div>
    );
  }

  const sidebarProps = {
    chats: chats.chats,
    activeChatId: chats.activeChatId,
    isLoadingChats: chats.isLoading,
    isCreatingChat: chats.isCreating,
    chatsError: chats.error,
    deletingChatId: chats.deletingChatId,
    onSelectChat: chats.selectChat,
    onNewChat: handleNewChat,
    onDeleteChat: handleDeleteChatRequest,
    onRetryChats: chats.refresh,
    documents,
    isLoadingSources: isInitialLoading,
    error,
    isSourcesExpanded: sourcesExpanded.isExpanded,
    onToggleSources: sourcesExpanded.toggle,
    onAdd: () => setAddOpen(true),
    onOpenSource: (document: DocumentSource) => setPreview({ document }),
    onDeleteSource: handleDeleteRequest,
    deletingId,
  };

  return (
    // Two independent full-height columns: the sidebar is the leftmost region
    // of the shell and owns the brand, so there is no global header above
    // them. Only the conversation scrolls; the page itself never does.
    <div className="flex h-svh overflow-hidden bg-canvas">
      <aside
        id="notebook-sources-panel"
        aria-label="Sources"
        // The sidebar's inner track keeps a fixed width so the collapse
        // animation works, which means its controls stay laid out while the
        // column is clipped to zero. `inert` removes them from the tab order
        // and the accessibility tree so keyboard focus cannot land on buttons
        // the user cannot see.
        inert={!sourcesPanel.isOpen}
        className={cn(
          "relative hidden shrink-0 overflow-hidden border-r border-line",
          "transition-[width,border-color] duration-200 ease-out lg:flex lg:flex-col",
          sourcesPanel.isOpen ? "w-[17rem]" : "w-0 border-r-0",
        )}
      >
        <div className="flex h-full w-[17rem] flex-col">
          <SidebarBrand
            isOpen={sourcesPanel.isOpen}
            onToggle={sourcesPanel.toggle}
          />

          <SidebarContent {...sidebarProps} />
        </div>
      </aside>

      {/* Collapsed: a narrow rail keeping both actions reachable. */}
      <AnimatePresence initial={false}>
        {!sourcesPanel.isOpen ? (
          <SourcesRail
            key="rail"
            onToggle={sourcesPanel.toggle}
            onNewChat={handleNewChat}
            onAddSource={() => setAddOpen(true)}
            isCreating={chats.isCreating}
            className="hidden lg:flex"
          />
        ) : null}
      </AnimatePresence>

      <main className="flex min-w-0 flex-1 flex-col bg-surface">
        <NotebookTopBar
          notebookName={notebook?.name}
          sourceCount={isInitialLoading ? undefined : documents.length}
          isLoading={isInitialLoading}
          onOpenSources={() => setMobileSourcesOpen(true)}
        />

        <ChatPanel
          hasSources={!isInitialLoading && documents.length > 0}
          sourceCount={documents.length}
          isLoadingSources={isInitialLoading}
          isLoadingHistory={chat.isLoadingHistory}
          activeChatId={chats.activeChatId}
          disabled={chats.activeChatId === null}
          disabledReason="Start a new chat to ask a question."
          messages={chat.messages}
          isAsking={chat.isAsking}
          error={chat.error}
          onSend={(question) => void chat.ask(question)}
          onStop={chat.stop}
          onRetry={() => void chat.retry()}
          onCitationClick={setActiveCitation}
        />
      </main>

      {/* Mobile sources sheet */}
      <Sheet open={isMobileSourcesOpen} onOpenChange={setMobileSourcesOpen}>
        <SheetContent
          side="left"
          className="w-full md:w-[85vw] md:max-w-sm p-0"
        >
          <SheetTitle className="sr-only">Sources</SheetTitle>
          <SheetDescription className="sr-only">
            Manage the sources in this notebook.
          </SheetDescription>
          <SidebarContent
            {...sidebarProps}
            className="[&>section:first-of-type]:pt-4"
          />
        </SheetContent>
      </Sheet>

      <AddSourceDialog
        open={isAddOpen}
        onOpenChange={setAddOpen}
        onAdd={handleAdd}
      />

      <SourcePreviewSheet
        document={preview?.document ?? null}
        open={preview !== null}
        onOpenChange={(open) => !open && setPreview(null)}
        citation={preview?.citation ?? null}
      />

      <CitationSheet
        citation={activeCitation}
        open={activeCitation !== null}
        onOpenChange={(open) => !open && setActiveCitation(null)}
        onViewFull={handleViewFullFromCitation}
      />

      <ConfirmDialog
        request={confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
      />
    </div>
  );
}