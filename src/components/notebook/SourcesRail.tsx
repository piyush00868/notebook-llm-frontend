import { motion } from "motion/react";
import { PanelLeftIcon, PlusIcon, SquarePenIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Narrow rail shown when the sidebar is collapsed.
 *
 * It repeats the three things the hidden sidebar would have offered: the
 * collapse control — which doubles as the way back, since the bar that owns
 * it is gone — new chat, and add-source. The last two would otherwise have no
 * entry point at all while the sidebar is closed.
 *
 * The order mirrors the open sidebar: toggle at the top, then the source
 * actions below it.
 */
export function SourcesRail({
  onToggle,
  onNewChat,
  onAddSource,
  isCreating,
  className,
}: {
  onToggle: () => void;
  onNewChat: () => void;
  onAddSource: () => void;
  /** True while a chat is being created, so the action can show a spinner. */
  isCreating?: boolean;
  className?: string;
}) {
  return (
    <motion.nav
      aria-label="Sources"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "z-20 flex w-12 shrink-0 flex-col items-center gap-1 border-r border-line bg-sunken py-2.5",
        className,
      )}
    >
      <RailAction label="Show sources" onClick={onToggle} controls="notebook-sources-panel">
        <PanelLeftIcon className="size-4.5" />
      </RailAction>

      <span aria-hidden="true" className="my-1 h-px w-5 bg-line" />

      <RailAction
        label="New chat"
        onClick={onNewChat}
        disabled={isCreating}
      >
        {isCreating ? (
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        ) : (
          <SquarePenIcon className="size-4.5" />
        )}
      </RailAction>

      <RailAction label="Add source" onClick={onAddSource}>
        <PlusIcon className="size-4.5" />
      </RailAction>
    </motion.nav>
  );
}

function RailAction({
  label,
  onClick,
  controls,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  controls?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-expanded={controls ? false : undefined}
            aria-controls={controls}
            disabled={disabled}
            className="flex size-9 items-center justify-center rounded-lg text-ink-tertiary transition-colors hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
          >
            {children}
          </button>
        }
      />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}