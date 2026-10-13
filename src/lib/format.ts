import type { DocumentSource, SourceType } from "@/types";

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 1000 * 60 * 60 * 24 * 365],
  ["month", 1000 * 60 * 60 * 24 * 30],
  ["week", 1000 * 60 * 60 * 24 * 7],
  ["day", 1000 * 60 * 60 * 24],
  ["hour", 1000 * 60 * 60],
  ["minute", 1000 * 60],
];

const relativeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

/** "2 hours ago", "yesterday", "just now". */
export function formatRelativeTime(value: string | Date | null | undefined) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);

  if (absMs < 45_000) return "just now";

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (absMs >= ms) {
      return relativeFormatter.format(Math.round(diffMs / ms), unit);
    }
  }

  return relativeFormatter.format(Math.round(diffMs / 1000), "second");
}

/** "3 sources" / "1 source" */
export function pluralize(count: number, singular: string, plural?: string) {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/** Human label for a persisted source type. */
export function sourceTypeLabel(sourceType: string): string {
  switch (sourceType) {
    case "PDF":
      return "PDF";
    case "TXT":
    case "TEXT":
      return "Text";
    case "WEB":
    case "URL":
      return "Website";
    case "YOUTUBE":
      return "YouTube";
    default:
      return sourceType.charAt(0) + sourceType.slice(1).toLowerCase();
  }
}

export type SourceStatus = "ready" | "processing" | "failed";

/** Normalise the backend status vocabulary into three UI states. */
export function sourceStatus(document: Pick<DocumentSource, "status">): SourceStatus {
  switch (document.status) {
    case "COMPLETED":
      return "ready";
    case "FAILED":
      return "failed";
    default:
      return "processing";
  }
}

export function sourceStatusLabel(status: SourceStatus): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "processing":
      return "Processing";
    case "failed":
      return "Failed";
  }
}

/** Recognised source types offered by the add-source flow. */
export const ADDABLE_SOURCE_TYPES: SourceType[] = [
  "PDF",
  "TXT",
  "WEB",
  "YOUTUBE",
  "TEXT",
];

/** Detects a YouTube URL so the website field can guide the user. */
export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/(?:watch|shorts|live)|youtu\.be\/)/i.test(url);
}

export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Best-effort display name for a website: hostname without `www.`.
 * Falls back to the raw value so the UI never renders an empty string.
 */
export function hostnameFromUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initialsFrom(name: string | null | undefined, fallback = "?"): string {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}