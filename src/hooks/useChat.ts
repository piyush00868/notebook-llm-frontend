import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";
import { toViewMessages, rememberChatLabel } from "@/lib/chatHistory";
import type { ChatMessage } from "@/types";

let messageCounter = 0;

/** Id for a message that only exists on screen, before/while it is in flight. */
function nextId(): string {
  messageCounter += 1;
  return `pending-${Date.now().toString(36)}-${messageCounter}`;
}

export interface ChatState {
  /** Messages of the active chat, oldest first. Empty while loading. */
  messages: ChatMessage[];
  /** True while an answer is being generated. */
  isAsking: boolean;
  /** True while the active chat's history is being restored. */
  isLoadingHistory: boolean;
  /** Set when history or the last attempt failed. */
  error: string | null;
  ask: (question: string) => Promise<void>;
  retry: () => Promise<void>;
  stop: () => void;
}

/**
 * Messages for one chat.
 *
 * History comes from `GET /notebooks/chats/:chatId/messages`, so it survives
 * a reload. Asking posts to that same chat, which persists both the question
 * and the grounded answer server-side.
 *
 * Every state update is scoped to the chat it belongs to. Asking is
 * deliberately optimistic — the question and a placeholder answer appear
 * immediately — so without that guard a slow reply landing after the user
 * switches chats would write another conversation's answer into the wrong one.
 */
export function useChat(chatId: number | null): ChatState {
  const api = useApi();
  const { getToken } = useAuth();

  /**
     * `chatId` this state was loaded for. Messages are only surfaced when it
     * matches the active chat, which is what stops one conversation appearing
     * in another.
   */
  const [state, setState] = useState<{
    chatId: number | null;
    messages: ChatMessage[];
    error: string | null;
    settled: boolean;
  }>({ chatId: null, messages: [], error: null, settled: false });

  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  /** Chat an in-flight request belongs to, checked before every write. */
  const pendingChatRef = useRef<number | null>(null);
  // The question behind the pending answer, kept so retry can resend it
  // without re-reading message state.
  const lastQuestionRef = useRef<string | null>(null);

  useEffect(() => {
    // A null chat has nothing to load. Aborting is enough — `messages` is
    // already derived as empty whenever the state's chat no longer matches.
    if (chatId === null) {
      abortRef.current?.abort();
      return;
    }

    const controller = new AbortController();
    let active = true;

    api
      .getChatMessages(chatId, controller.signal)
      .then((records) => {
        if (!active) return;
        const messages = toViewMessages(records ?? []);

        // The first question is the chat's label in the history list, since
        // the backend stores no title.
        const firstQuestion = messages.find((m) => m.role === "user");
        if (firstQuestion) rememberChatLabel(chatId, firstQuestion.content);

        setState({ chatId, messages, error: null, settled: true });
      })
      .catch((cause: unknown) => {
        if (!active || controller.signal.aborted) return;
        setState({
          chatId,
          messages: [],
          error:
            cause instanceof Error
              ? cause.message
              : "We could not load this conversation.",
          settled: true,
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [api, chatId]);

  /**
     * Applies `updater` only while `targetChatId` is still the active chat.
     * This is the guard that keeps a late reply out of the wrong thread.
   */
  const updateMessages = useCallback(
    (targetChatId: number, updater: (current: ChatMessage[]) => ChatMessage[]) => {
      setState((current) => {
        if (current.chatId !== targetChatId) return current;
        return { ...current, messages: updater(current.messages) };
      });
    },
    [],
  );

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || chatId === null || isAsking) return;

      lastQuestionRef.current = trimmed;
      setAskError(null);
      setIsAsking(true);
      pendingChatRef.current = chatId;

      const assistantId = nextId();

      // The question and a placeholder answer appear together so the thread
      // reads as a pair rather than a lone question under a spinner.
      updateMessages(chatId, (current) => [
        ...current,
        {
          id: `pending-q-${assistantId}`,
          role: "user",
          content: trimmed,
          createdAt: Date.now(),
        },
        {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: Date.now(),
        },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const token = await getToken();
        
        // Use fetch directly for SSE streaming
        const response = await fetch(
          `${import.meta.env.VITE_API_URL ?? "http://localhost:4000"}/notebooks/chats/${chatId}/ask`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ question: trimmed }),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(errorBody || `Request failed: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullAnswer = "";

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.done) {
                    break;
                  }
                  if (parsed.error) {
                    throw new Error(parsed.error);
                  }
                  if (parsed.text) {
                    fullAnswer += parsed.text;
                    updateMessages(chatId, (current) =>
                      current.map((message) =>
                        message.id === assistantId
                          ? { ...message, content: fullAnswer }
                          : message,
                      ),
                    );
                  }
                  if (parsed.sources) {
                    // Sources are saved server-side; not needed client-side here.
                  }
                } catch (e) {
                  // Ignore parse errors for partial SSE lines
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        // Assistant's answer is saved server-side in askChatController after streaming.
        // No client-side save needed.

        /*
         *
         * The optimistic turn carries a client id, not the database one, so
         * without this the ids on screen would never match a reload. The
         * refetch happens after the answer is already on screen, so it cannot
         * introduce a visible pause, and `updateMessages` ignores it if the
         * user has since switched conversation.
         */
        api
          .getChatMessages(chatId)
          .then((records) => {
            if (controller.signal.aborted) return;
            const stored = toViewMessages(records ?? []);
            const firstQuestion = stored.find((m) => m.role === "user");
            if (firstQuestion) rememberChatLabel(chatId, firstQuestion.content);
            updateMessages(chatId, () => stored);
          })
          .catch(() => {
            // Keep the optimistic render; a later load will correct it.
          });
      } catch (cause) {
        if (controller.signal.aborted) {
          // Cancelled: drop the pair rather than leaving a spinner behind.
          updateMessages(chatId, (current) =>
            current.filter(
              (message) =>
                message.id !== assistantId &&
                message.id !== `pending-q-${assistantId}`,
            ),
          );
          setAskError(null);
          return;
        }

        const text =
          cause instanceof Error
            ? cause.message
            : "We could not get an answer. Please try again.";

        updateMessages(chatId, (current) =>
          current.map((entry) =>
            entry.id === assistantId
              ? { ...entry, content: "", error: text }
              : entry,
          ),
        );
        setAskError(text);
      } finally {
        abortRef.current = null;
        pendingChatRef.current = null;
        setIsAsking(false);
      }
    },
    [api, chatId, isAsking, updateMessages],
  );

  const retry = useCallback(async () => {
    const question = lastQuestionRef.current;
    if (!question || chatId === null) return;

    // Drop the failed turn before resending.
    updateMessages(chatId, (current) => {
      const last = current[current.length - 1];
      if (last?.role === "assistant" && last.error) return current.slice(0, -1);
      return current;
    });

    await ask(question);
  }, [ask, chatId, updateMessages]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const settled = state.chatId === chatId;
  const isLoadingHistory = chatId !== null && !settled;

  return {
    messages: settled ? state.messages : [],
    isAsking,
    isLoadingHistory,
    // A stale ask error must not surface against the newly selected chat.
    error: settled ? (askError ?? state.error) : null,
    ask,
    retry,
    stop,
  };
}