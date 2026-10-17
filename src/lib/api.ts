import { useAuth } from "@clerk/clerk-react";
import { useMemo } from "react";
import type {
  AskResponse,
  ChatMessageRecord,
  ChatSession,
  DocumentSource,
  Notebook,
  User,
  Workspace,
} from "@/types";

/**
 * Backend base URL.
 *
 * The Express server defaults to PORT=4000. Override per environment with
 * `VITE_API_URL` (see `.env`). No backend change is required for this.
 */
const API_BASE_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:4000"
).replace(/\/+$/, "");

/** Error carrying the HTTP status so callers can branch on 401/404/etc. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  /** Pre-built body (e.g. FormData) — skips JSON serialisation. */
  rawBody?: BodyInit;
  signal?: AbortSignal;
};

type TokenGetter = () => Promise<string | null>;

/**
 * Single authenticated transport for the whole app.
 *
 * Components never call `fetch` directly. Auth uses the active Clerk
 * session token via `getToken()`; tokens are never hardcoded or persisted.
 */
export function createApiClient(getToken: TokenGetter) {
  async function request<T>(path: string, options: RequestOptions = {}) {
    const token = await getToken();

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let body: BodyInit | undefined = options.rawBody;
    if (body === undefined && options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method: options.method ?? "GET",
        headers,
        body,
        signal: options.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      throw new ApiError(
        "Could not reach the server. Check your connection and try again.",
        0,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const isJson = response.headers
      .get("content-type")
      ?.includes("application/json");

    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        (isJson && payload && typeof payload === "object" && "error" in payload
          ? String((payload as { error: unknown }).error)
          : null) ??
        (typeof payload === "string" && payload
          ? payload
          : `Request failed (${response.status})`);
      throw new ApiError(message, response.status);
    }

    return payload as T;
  }

  return {
    /** Current user, synchronised server-side on first call. */
    getCurrentUser: (signal?: AbortSignal) =>
      request<User>("/users/me", { signal }),

    /**
     * Every workspace the caller owns, newest first.
     *
     * This is what makes existing workspaces reachable: with only
     * `POST /workspaces` and `GET /workspaces/:id`, a client had no way to
     * discover a workspace it had already created, so a stale cached id looked
     * exactly like data loss.
     */
    listWorkspaces: (signal?: AbortSignal) =>
      request<Workspace[]>("/workspaces", { signal }),

    createWorkspace: (name: string) =>
      request<Workspace>("/workspaces", {
        method: "POST",
        body: { name },
      }),

    getWorkspace: (id: number, signal?: AbortSignal) =>
      request<Workspace>(`/workspaces/${id}`, { signal }),

    deleteWorkspace: (id: number) =>
      request<{ message: string }>(`/workspaces/${id}`, { method: "DELETE" }),

    createNotebook: (input: { name: string; workspaceId: number }) =>
      request<Notebook>("/notebooks", { method: "POST", body: input }),

    getNotebook: (id: number, signal?: AbortSignal) =>
      request<Notebook>(`/notebooks/${id}`, { signal }),

    deleteNotebook: (id: number) =>
      request<{ message: string }>(`/notebooks/${id}`, { method: "DELETE" }),

    /**
     * Conversations are persisted through the chat-scoped routes.
     *
     * The notebook-scoped `POST /notebooks/:id/ask` is deliberately no longer
     * used: it runs the same RAG pipeline but writes no `Chat`/`ChatMessage`
     * rows, so every answer was lost on reload.
     */
    createChat: (notebookId: number) =>
      request<ChatSession>(`/notebooks/${notebookId}/chats`, {
        method: "POST",
      }),

    listChats: (notebookId: number, signal?: AbortSignal) =>
      request<ChatSession[]>(`/notebooks/${notebookId}/chats`, { signal }),

    getChatMessages: (chatId: number, signal?: AbortSignal) =>
      request<ChatMessageRecord[]>(`/notebooks/chats/${chatId}/messages`, {
        signal,
      }),

    /**
     * Deletes a conversation and its messages.
     *
     * `Chat` has no title to show in the history list, so without a delete a
     * chat can only be left behind.
     */
    deleteChat: (chatId: number) =>
      request<{ message: string }>(`/notebooks/chats/${chatId}`, {
        method: "DELETE",
      }),

    /**
     * Asks a question inside a chat.
     *
     * The backend persists the question and the grounded answer before
     * responding, so the response carries only what the UI needs to render:
     * the answer text and its citations.
     */
    askChat: (
      chatId: number,
      question: string,
      signal?: AbortSignal,
    ) =>
      request<AskResponse>(`/notebooks/chats/${chatId}/ask`, {
        method: "POST",
        body: { question },
        signal,
      }),

    getDocument: (id: number, signal?: AbortSignal) =>
      request<DocumentSource>(`/documents/${id}`, { signal }),

    deleteDocument: (id: number) =>
      request<void>(`/documents/${id}`, { method: "DELETE" }),

    /** PDF / TXT upload. The backend accepts PDF only (`upload.middleware`). */
    uploadDocument: (input: {
      notebookId: number;
      title: string;
      file: File;
    }) => {
      const form = new FormData();
      form.append("notebookId", String(input.notebookId));
      form.append("title", input.title);
      form.append("file", input.file);

      return request<{ message: string; document: DocumentSource }>(
        "/documents/upload",
        { method: "POST", rawBody: form },
      );
    },

    addWebsiteSource: (input: {
      notebookId: number;
      title: string;
      url: string;
    }) => request<DocumentSource>("/documents/url", { method: "POST", body: input }),

    addYoutubeSource: (input: {
      notebookId: number;
      title: string;
      url: string;
    }) =>
      request<DocumentSource>("/documents/youtube", {
        method: "POST",
        body: input,
      }),

    /**
     * Whether the signed-in user has connected a Google account.
     *
     * Connecting is what makes YouTube ingestion reliable: the official
     * captions endpoint requires a user's OAuth token because Google refuses
     * API keys for it. Without a connection the backend falls back to
     * scraping, which YouTube blocks from datacentre IPs.
     */
    getYouTubeConnection: () =>
      request<{ configured: boolean; connected: boolean }>(
        "/auth/youtube/status",
      ),

    /** Disconnects the account by discarding the stored refresh token. */
    disconnectYouTube: () =>
      request<{ connected: boolean }>("/auth/youtube", { method: "DELETE" }),

    /**
     * Pasted text. Ingested server-side like every other source: the route
     * normalises, chunks and embeds the text before returning, so the source
     * is reachable by retrieval as soon as it reports COMPLETED.
     */
    createTextSource: (input: {
      notebookId: number;
      title: string;
      content: string;
    }) =>
      request<DocumentSource>("/documents/text", {
        method: "POST",
        body: {
          notebookId: input.notebookId,
          title: input.title,
          content: input.content,
        },
      }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

/**
 * Client bound to the active Clerk session.
 *
 * `getToken` from Clerk is stable for a session, so memoising on it gives
 * every hook in the tree one shared client and rebuilds on sign-in/out.
 */
export function useApi(): ApiClient {
  const { getToken } = useAuth();

  return useMemo(() => createApiClient(() => getToken()), [getToken]);
}

export { API_BASE_URL };