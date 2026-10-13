import type { ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowUpIcon, Loader2Icon, SquareIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MAX_LENGTH = 2000;

/**
 * Chat composer.
 *
 * Flowstep: a single rounded field with the placeholder inline and a
 * circular blue send button pinned to the right. Enter sends, Shift+Enter
 * inserts a newline. The field auto-grows to a capped height so long
 * questions never push the thread off screen.
 */
export function ChatComposer({
  onSend,
  onStop,
  isBusy,
  disabled,
  disabledReason,
  value,
  onValueChange,
}: {
  onSend: (question: string) => void;
  onStop: () => void;
  isBusy: boolean;
  disabled?: boolean;
  /** Shown instead of the editor when the notebook has no sources. */
  disabledReason?: string;
  value: string;
  onValueChange: (value: string) => void;
}) {
  const canSend = value.trim().length > 0 && !isBusy && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend(value.trim());
    onValueChange("");
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;
    if (event.shiftKey || event.nativeEvent.isComposing) return;

    event.preventDefault();
    submit();
  };

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onValueChange(event.target.value);

    const element = event.target;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  };

  if (disabled) {
    return (
      <div className="shrink-0 bg-surface px-4 pt-3 pb-4 sm:px-6">
        <p className="mx-auto max-w-3xl text-center text-[0.8125rem] text-ink-tertiary">
          {disabledReason ?? "Add a source to start asking questions."}
        </p>
      </div>
    );
  }

  return (
    <div className="shrink-0 bg-surface px-4 pt-3 pb-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div
          className={cn(
            "flex items-end gap-2 rounded-xl border border-line bg-sunken px-3 py-1.5 shadow-subtle",
            // Focus lifts the field by brightening its border and adding a
            // whisper of shadow rather than drawing a blue outline — the
            // composer should sit in the page, not glow on top of it.
            "transition-[border-color,box-shadow,background-color] duration-200",
            "hover:border-line-strong",
            "focus-within:border-line-strong focus-within:bg-surface focus-within:shadow-raised",
          )}
        >
          <Textarea
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your sources…"
            aria-label="Ask a question about your sources"
            rows={1}
            maxLength={MAX_LENGTH}
            disabled={isBusy}
            className="max-h-40 min-h-[2.25rem] flex-1 resize-none border-0 bg-transparent px-0 py-1.5 text-[0.9375rem] leading-relaxed text-ink shadow-none placeholder:text-ink-tertiary focus-visible:ring-0 dark:bg-transparent"
          />

          {isBusy ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onStop}
              aria-label="Stop generating"
              className="size-9 shrink-0 rounded-full text-ink-secondary"
            >
              <SquareIcon className="size-4 fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={submit}
              disabled={!canSend}
              aria-label="Send question"
              className="size-9 shrink-0 rounded-full"
            >
              {isBusy ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <ArrowUpIcon />
              )}
            </Button>
          )}
        </div>

        <p className="mt-2 text-center text-[0.75rem] text-ink-tertiary">
          Answers are grounded in this notebook's sources.
        </p>
      </div>
    </div>
  );
}

/** Small circular glyph used as the assistant's avatar. */
export function AssistantAvatar() {
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tinted"
    >
      <span className="size-2.5 rounded-full bg-accent" />
    </span>
  );
}

/** User-side avatar, matching the assistant's footprint. */
export function UserAvatar({ label }: { label?: string }) {
  const initials = (label ?? "You").slice(0, 2).toUpperCase();

  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sunken text-[0.6875rem] font-medium text-ink-tertiary"
    >
      {initials}
    </span>
  );
}

/** Shared wrapper for a chat turn. */
export function Turn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.li>
  );
}