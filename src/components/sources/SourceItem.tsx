import { motion } from "motion/react";
import { ExternalLinkIcon, MoreHorizontalIcon, Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { sourceTypeLabel } from "@/lib/format";
import { renderSourceIcon } from "@/lib/sources";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SourceFailureNote, SourceStatusBadge } from "@/components/sources/SourceStatusBadge";
import type { DocumentSource } from "@/types";

/**
 * One source card.
 *
 * Flowstep: a white card carrying a blue glyph tile, the title, and a
 * `PDF · Ready` meta line. The card itself opens the preview; the actions
 * menu is a separate control so the two intents never share a target.
 */
export function SourceItem({
  document,
  onOpen,
  onDelete,
  isDeleting,
}: {
  document: DocumentSource;
  onOpen: (document: DocumentSource) => void;
  onDelete: (document: DocumentSource) => void;
  isDeleting: boolean;
}) {
  const isLink = Boolean(document.sourceUrl);

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      data-source-id={document.id}
      className={cn(
        "group relative rounded-lg transition-colors",
        "hover:bg-surface focus-within:bg-surface",
        isDeleting && "pointer-events-none opacity-50",
      )}
    >
      <div className="flex items-start gap-2 px-2 py-2">
        <button
          type="button"
          onClick={() => onOpen(document)}
          className="flex min-w-0 flex-1 items-start gap-2.5 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          <span
            aria-hidden="true"
            className="mt-px flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent"
          >
            <SourceTypeIcon sourceType={document.sourceType} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.8125rem] leading-snug font-medium text-ink">
              {document.title}
            </span>

            <span className="mt-0.5 flex items-center gap-1.5 text-[0.6875rem] text-ink-tertiary">
              <span>{sourceTypeLabel(document.sourceType)}</span>
              <span aria-hidden="true">·</span>
              <SourceStatusBadge document={document} />
            </span>

            <SourceFailureNote document={document} className="mt-1" />
          </span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="mt-px shrink-0 text-ink-tertiary opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 data-[open]:opacity-100"
              >
                <MoreHorizontalIcon />
                <span className="sr-only">Actions for {document.title}</span>
              </Button>
            }
          />

          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onOpen(document)}>
              View source
            </DropdownMenuItem>
            {isLink ? (
              <DropdownMenuItem
                // The rendered element is an anchor, not a button.
                nativeButton={false}
                render={
                  <a
                    href={document.sourceUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <ExternalLinkIcon />
                Open original
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(document)}
            >
              <Trash2Icon />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.li>
  );
}

/**
 * Resolves the icon inside a component boundary. Looking up a component and
 * rendering it in the same function makes the React compiler treat the render
 * as creating a component.
 */
function SourceTypeIcon({ sourceType }: { sourceType: string }) {
  return <SourceGlyph sourceType={sourceType} />;
}

function SourceGlyph({ sourceType }: { sourceType: string }) {
  return <>{renderSourceIcon(sourceType, "size-3.5")}</>;
}