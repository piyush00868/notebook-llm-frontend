import type {
  ChatMessage,
  ChatMessageRecord,
  ChatRole,
  Citation,
  ChatSession,
} from "@/types";

/** Roles the renderer knows how to draw. */
const KNOWN_ROLES: readonly string[] = ["user", "assistant"];

function parseTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Orders stored messages oldest-first.
 *
 * The backend fetches with `.where({ chatId })` and no `orderBy`, so row order
 * is whatever Postgres returns and cannot be relied on. `createdAt` alone is
 * not a total order either — a question and its answer can land in the same
 * millisecond — so the autoincrement `id` breaks ties deterministically and
 * the same chat always renders in the same sequence.
 */
export function sortMessages(
  records: readonly ChatMessageRecord[],
): ChatMessageRecord[] {
  return [...records].sort((a, b) => {
    const byTime = parseTimestamp(a.createdAt) - parseTimestamp(b.createdAt);
    if (byTime !== 0) return byTime;
    return a.id - b.id;
  });
}

/**
 * Narrows the nullable `sources` JSON into citations.
 *
 * Anything unexpected is dropped rather than trusted: a malformed entry must
 * not be able to crash the message it belongs to. Older rows written before
 * citations existed carry `sources: null`, which yields an empty list — the
 * assistant message still renders, just without evidence.
 */
export function normalizeSources(raw: unknown): Citation[] {
  if (!Array.isArray(raw)) return [];

  const citations: Citation[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;

    const record = entry as Record<string, unknown>;
    const index = Number(record.index);
    const documentId = Number(record.documentId);

    if (!Number.isFinite(index) || !Number.isFinite(documentId)) continue;

    const chunkIndex = Number(record.chunkIndex);

    citations.push({
      index,
      documentId,
      documentTitle:
        typeof record.documentTitle === "string" && record.documentTitle
          ? record.documentTitle
          : "Untitled source",
      chunkId: Number.isFinite(Number(record.chunkId)) ? Number(record.chunkId) : 0,
      chunkIndex: Number.isFinite(chunkIndex) ? chunkIndex : Math.max(index - 1, 0),
      score: typeof record.score === "number" ? record.score : undefined,
    });
  }

  return citations;
}

/**
 * Converts stored rows into the view model the chat renderer consumes.
 *
 * Rows with an unrecognised role are skipped rather than guessed at, and each
 * message keeps its numeric row id in a stable composite key so React can
 * track it across a re-render without ever colliding with the optimistic
 * ids used for in-flight answers.
 */
export function toViewMessages(
  records: readonly ChatMessageRecord[],
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  for (const record of sortMessages(records)) {
    const role = String(record.role ?? "").toLowerCase();
    if (!KNOWN_ROLES.includes(role)) continue;

    messages.push({
      id: `c${record.chatId}-m${record.id}`,
      role: role as ChatRole,
      content: typeof record.content === "string" ? record.content : "",
      createdAt: parseTimestamp(record.createdAt),
      // Only assistant turns carry evidence. `null` becomes `[]`, which the
      // renderer treats as "no sources" rather than as an error.
      sources: role === "assistant" ? normalizeSources(record.sources) : undefined,
    });
  }

  return messages;
}

/** Most recently touched first — the order the history list is shown in. */
export function sortSessions(
  sessions: readonly ChatSession[],
): ChatSession[] {
  return [...sessions].sort((a, b) => {
    const byTime = parseTimestamp(b.updatedAt) - parseTimestamp(a.updatedAt);
    if (byTime !== 0) return byTime;
    return b.id - a.id;
  });
}

export interface SessionGroup {
  /** Stable key for React and for the section heading. */
  key: ChatGroupKey;
  label: string;
  sessions: ChatSession[];
}

export type ChatGroupKey = "today" | "yesterday" | "week" | "earlier";

const GROUP_LABEL: Record<ChatGroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "Previous 7 days",
  earlier: "Earlier",
};

const MS_PER_DAY = 86_400_000;

/**
 * Buckets conversations by how recently they were touched.
 *
 * `sortSessions` already puts the newest first; this only adds headings so a
 * long history stays scannable and a chat's position is predictable rather
 * than something the user has to re-derive from the list itself.
 *
 * Boundaries are computed against local midnight rather than rolling 24-hour
 * windows, so "Today" empties at midnight the way people expect.
 *
 * Sessions with an unparseable timestamp fall into "Earlier" rather than
 * disappearing, which would silently hide a conversation.
 */
export function groupSessions(
  sessions: readonly ChatSession[],
  now: number = Date.now(),
): SessionGroup[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const todayStart = startOfToday.getTime();
  const yesterdayStart = todayStart - MS_PER_DAY;
  const weekStart = todayStart - 7 * MS_PER_DAY;

  const buckets: Record<ChatGroupKey, ChatSession[]> = {
    today: [],
    yesterday: [],
    week: [],
    earlier: [],
  };

  for (const session of sortSessions(sessions)) {
    const at = parseTimestamp(session.updatedAt) || parseTimestamp(session.createdAt);
    if (at >= todayStart) buckets.today.push(session);
    else if (at >= yesterdayStart) buckets.yesterday.push(session);
    else if (at >= weekStart) buckets.week.push(session);
    else buckets.earlier.push(session);
  }

  const order: ChatGroupKey[] = ["today", "yesterday", "week", "earlier"];

  return order
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({
      key,
      label: GROUP_LABEL[key],
      sessions: buckets[key],
    }));
}

/**
 * Chat labels.
 *
 * `Chat` has no title column, so the history list would otherwise show only a
 * date — three conversations created the same day are indistinguishable.
 *
 * The first question a chat received is the natural label, and the app already
 * has it: loading a chat's messages yields its first user turn. That text is
 * cached in local storage keyed by chat id, so a chat becomes recognisable
 * once it has been opened or asked in, and anything older falls back to its
 * date rather than showing nothing.
 *
 * TODO(backend): add `Chat.title` (or return a derived title with the chat
 * list) and this cache can be dropped in favour of the server's value.
 */
const LABEL_KEY = "mindora:chat-labels";

/** Bound on the cache so it cannot grow without limit. */
const LABEL_LIMIT = 200;

type LabelMap = Record<string, string>;

function readLabels(): LabelMap {
  try {
    const raw = window.localStorage.getItem(LABEL_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const map: LabelMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value) map[key] = value;
    }
    return map;
  } catch {
    return {};
  }
}

/** Collapses a question into something that fits a narrow sidebar row. */
export function toChatLabel(content: string): string {
  const flat = content.replace(/\s+/g, " ").trim();
  if (!flat) return "";
  return flat.length > 40 ? `${flat.slice(0, 40).trimEnd()}…` : flat;
}

/**
 * Remembers a chat's label.
 *
 * Only the first label for a chat is kept: later questions in the same thread
 * must not rename a conversation the user already recognises.
 */
export function rememberChatLabel(chatId: number, firstUserMessage: string) {
  const label = toChatLabel(firstUserMessage);
  if (!label) return;

  try {
    const labels = readLabels();
    const key = String(chatId);
    if (labels[key]) return;

    const next: LabelMap = { ...labels, [key]: label };
    const keys = Object.keys(next);

    // Evict the oldest insertions once the cap is exceeded.
    if (keys.length > LABEL_LIMIT) {
      for (const stale of keys.slice(0, keys.length - LABEL_LIMIT)) {
        delete next[stale];
      }
    }

    window.localStorage.setItem(LABEL_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable; the date fallback still labels the row.
  }
}

/** Reads the cached label for a chat, if one was remembered. */
export function cachedChatLabel(chatId: number): string | null {
  return readLabels()[String(chatId)] ?? null;
}

/**
 * Label for a chat in the history list: the cached first question when there
 * is one, otherwise the date the conversation was last active.
 */
export function sessionLabel(session: ChatSession): string {
  return cachedChatLabel(session.id) ?? formatSessionDate(session.updatedAt);
}

function formatSessionDate(value: string): string {
  const ms = parseTimestamp(value);
  if (ms === 0) return "New chat";

  const date = new Date(ms);

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}