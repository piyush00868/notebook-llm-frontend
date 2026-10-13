import {
  FileTextIcon,
  GlobeIcon,
  PlayIcon,
  TextIcon,
  UploadIcon,
} from "lucide-react";
import type { SourceType } from "@/types";

/** The ways a source can enter a notebook. */
export type AddSourceKind = "file" | "website" | "youtube" | "text";

export interface SourceKindMeta {
  kind: AddSourceKind;
  label: string;
  description: string;
}

export const SOURCE_KINDS: SourceKindMeta[] = [
  { kind: "file", label: "Upload file", description: "PDF from your computer" },
  { kind: "website", label: "Website", description: "Any article or page" },
  { kind: "youtube", label: "YouTube", description: "Video transcript" },
  { kind: "text", label: "Paste text", description: "Notes or excerpts" },
];

export function sourceKindMeta(kind: AddSourceKind): SourceKindMeta {
  return SOURCE_KINDS.find((entry) => entry.kind === kind)!;
}

/**
 * Icon for a source-kind tile.
 *
 * These return markup rather than a component reference on purpose: resolving
 * an icon to a component and rendering it in the same function makes the React
 * compiler treat the render as creating a component, which resets its state
 * on every render and is reported as an error.
 */
export function renderKindIcon(
  kind: AddSourceKind,
  className = "size-4",
): React.ReactElement {
  switch (kind) {
    case "file":
      return <UploadIcon className={className} />;
    case "website":
      return <GlobeIcon className={className} />;
    case "youtube":
      return <PlayIcon className={className} />;
    case "text":
      return <TextIcon className={className} />;
  }
}

/** Icon for a persisted document, derived from its stored sourceType. */
export function renderSourceIcon(
  sourceType: string,
  className = "size-3.5",
): React.ReactElement {
  switch (sourceType) {
    case "PDF":
      return <FileTextIcon className={className} />;
    case "WEB":
    case "URL":
      return <GlobeIcon className={className} />;
    case "YOUTUBE":
      return <PlayIcon className={className} />;
    case "TEXT":
    case "TXT":
      return <TextIcon className={className} />;
    default:
      return <FileTextIcon className={className} />;
  }
}

/** The backend persists TXT uploads as PDF, so label by upload kind. */
export function sourceTypeForKind(kind: AddSourceKind): SourceType {
  return kind === "website" ? "WEB" : kind === "youtube" ? "YOUTUBE" : "TEXT";
}