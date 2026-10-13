import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api";
import { sortSessions } from "@/lib/chatHistory";
import type { ChatSession } from "@/types";

/**
 * Which chat is active is a workspace preference, not navigation state, so it
 * survives a reload the same way the collapsed-sidebar preference does.
 * Keyed per notebook so switching notebooks never restores another
 * notebook's conversation.
 */
const STORAGE_PREFIX = "mindora:active-chat";

function storageKey(notebookId: number) {
  return `${STORAGE_PREFIX}:${notebookId}`;
}

function readStored(notebookId: number): number | null {
  try {
    const raw = window.localStorage.getItem(storageKey(notebookId));
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

function writeStored(notebookId: number, chatId: number | null) {
  try {
    if (chatId === null) window.localStorage.removeItem(storageKey(notebookId));
    else window.localStorage.setItem(storageKey(notebookId), String(chatId));
  } catch {
    // Preference simply will not persist; the session still works.
  }
}

export interface ChatsState {
  /** Most recently updated first. */
  chats: ChatSession[];
  activeChatId: number | null;
  isLoading: boolean;
  isCreating: boolean;
  /** Set when the list or a creation failed. */
  error: string | null;
  selectChat: (chatId: number) => void;
  /** Creates and activates a chat. Resolves to its id, or `null` on failure. */
  newChat: () => Promise<number | null>;
  /** Deletes a chat and its messages. Resolves to `true` when it succeeded. */
  deleteChat: (chatId: number) => Promise<boolean>;
  /** True while a delete is in flight, for the row's busy state. */
  deletingChatId: number | null;
  refresh: () => void;
  dismissError: () => void;
}

interface ListState {
  notebookId: number | null;
  chats: ChatSession[];
  error: string | null;
  settled: boolean;
}

/**
 * Chat list and active-conversation state for one notebook.
 *
 * Chats are fetched from `GET /notebooks/:id/chats`, which scopes them to the
 * notebook server-side, so a chat created in one notebook cannot appear in
 * another's list.
 *
 * A notebook with no conversations is left that way: the chat area prompts for
 * "New chat" instead, rather than writing a row merely because the page was
 * opened.
 */
export function useChats(notebookId: number | null): ChatsState {
  const api = useApi();

  const [requestKey, setRequestKey] = useState(0);
  const [state, setState] = useState<ListState>({
    notebookId: null,
    chats: [],
    error: null,
    settled: false,
  });
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  /**
     * Guards concurrent creation. A ref rather than state because two clicks
     * in the same tick must both observe the in-flight flag before either
     * one awaits.
   */
  const creatingRef = useRef(false);

  /**
   * Mirrors `activeChatId` for the list effect, which must read the current
     * selection without listing state in its dependencies and re-fetching.
   */
  const activeChatRef = useRef<number | null>(null);
  useEffect(() => {
    activeChatRef.current = activeChatId;
  }, [activeChatId]);

  /** Mirrors the loaded chat list so callbacks can read it without deps. */
  const chatsRef = useRef<ChatSession[]>([]);
  useEffect(() => {
    chatsRef.current = state.chats;
  }, [state.chats]);

  const activate = useCallback((target: number | null, chatId: number | null) => {
    setActiveChatId(chatId);
    if (target !== null) writeStored(target, chatId);
  }, []);

  const create = useCallback(
    async (targetNotebookId: number): Promise<number | null> => {
      if (creatingRef.current) return null;
      creatingRef.current = true;
      setIsCreating(true);
      setActionError(null);

      try {
        const chat = await api.createChat(targetNotebookId);

        // Insert at the front: a brand-new chat is the most recently updated.
        setState((current) => {
          if (current.notebookId !== targetNotebookId) return current;
          const without = current.chats.filter((c) => c.id !== chat.id);
          return { ...current, chats: [chat, ...without], settled: true };
        });

        activate(targetNotebookId, chat.id);
        return chat.id;
      } catch (cause) {
        setActionError(
          cause instanceof Error
            ? cause.message
            : "We could not start a new chat.",
        );
        return null;
      } finally {
        creatingRef.current = false;
        setIsCreating(false);
      }
    },
    [activate, api],
  );

  useEffect(() => {
    // Nothing to load without a notebook. `chats` and `activeChatId` are
    // already derived as empty/null whenever the state's notebook no longer
    // matches the active one, so no synchronous state write is needed here.
    if (!notebookId) return;

    const controller = new AbortController();
    let active = true;

    api
      .listChats(notebookId, controller.signal)
      .then((sessions) => {
        if (!active) return;

        const chats = sortSessions(sessions ?? []);
        setState({ notebookId, chats, error: null, settled: true });

        // Restore the remembered conversation, but only if it still exists in
        // this notebook's list — otherwise fall back to the newest chat. The
        // resolved id is persisted so reopening the notebook is stable even
        // when the user never picked a chat by hand.
        const stored = readStored(notebookId);
        const resolved =
          activeChatRef.current !== null &&
          chats.some((c) => c.id === activeChatRef.current)
            ? activeChatRef.current
            : stored !== null && chats.some((c) => c.id === stored)
              ? stored
              : (chats[0]?.id ?? null);

        activate(notebookId, resolved);
      })
      .catch((cause: unknown) => {
        if (!active || controller.signal.aborted) return;
        setState({
          notebookId,
          chats: [],
          error:
            cause instanceof Error
              ? cause.message
              : "We could not load your chats.",
          settled: true,
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [activate, api, notebookId, requestKey]);

  const selectChat = useCallback(
    (chatId: number) => activate(notebookId, chatId),
    [activate, notebookId],
  );

  const newChat = useCallback(
    async () => (notebookId === null ? null : create(notebookId)),
    [create, notebookId],
  );

  const refresh = useCallback(() => setRequestKey((value) => value + 1), []);

  const [deletingChatId, setDeletingChatId] = useState<number | null>(null);

  /**
   * Deletes a conversation.
   *
   * Deleting the active chat has to leave something selected, so the next
   * conversation in the list is promoted rather than leaving the chat area
   * pointing at a conversation that no longer exists.
   */
  const deleteChat = useCallback(
    async (chatId: number): Promise<boolean> => {
      setDeletingChatId(chatId);
      setActionError(null);

      try {
        await api.deleteChat(chatId);

        const remaining = chatsRef.current.filter((c) => c.id !== chatId);
        chatsRef.current = remaining;
        setState((current) => ({ ...current, chats: remaining }));

        // Deleting the conversation on screen has to promote another one,
        // otherwise the chat area would point at something that no longer
        // exists.
        if (activeChatRef.current === chatId && notebookId !== null) {
          const stored = readStored(notebookId);
          const next =
            stored !== null && remaining.some((c) => c.id === stored)
              ? stored
              : (remaining[0]?.id ?? null);

          activate(notebookId, next);
        }

        return true;
      } catch (cause) {
        setActionError(
          cause instanceof Error
            ? cause.message
            : "We could not delete that chat.",
        );
        return false;
      } finally {
        setDeletingChatId(null);
      }
    },
    [activate, api, notebookId],
  );

  const dismissError = useCallback(() => {
    setActionError(null);
    setState((current) => ({ ...current, error: null }));
  }, []);

  const settled = state.notebookId === notebookId && state.settled;

  return {
    chats: settled ? state.chats : [],
    // Never point at a chat belonging to a previous notebook.
    activeChatId: settled ? activeChatId : null,
    isLoading: notebookId !== null && !settled,
    isCreating,
    error: settled ? (actionError ?? state.error) : null,
    selectChat,
    newChat,
    deleteChat,
    deletingChatId,
    refresh,
    dismissError,
  };
}