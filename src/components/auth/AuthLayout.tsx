import type { ReactNode } from "react";
import {
  FileTextIcon,
  LayersIcon,
  MessagesSquareIcon,
} from "lucide-react";
import { BrandLockup } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/utils";

/**
 * Authentication frame.
 *
 * A single rounded card split into two halves: a quiet product panel on the
 * left explaining what Mindora is for, and the form on the right. Below `md`
 * it collapses to one column with the panel reduced to the brand and headline
 * so the form is what you meet on a phone.
 */
export function AuthLayout({
  children,
  footer = "Private by design. Grounded in your sources.",
  className,
}: {
  children: ReactNode;
  footer?: string;
  className?: string;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-canvas px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center py-4 sm:py-6">
        <div
          className={cn(
            "w-full max-w-[64rem] overflow-hidden rounded-2xl border border-line bg-surface shadow-raised",
            "md:grid md:grid-cols-[23rem_1fr]",
            className,
          )}
        >
          <ProductPanel />

          <main className="px-6 py-8 sm:px-10 md:px-12 md:py-12">
            <div className="mx-auto w-full max-w-sm md:max-w-none">
              {children}
            </div>
          </main>
        </div>
      </div>

      <p className="text-center text-[0.8125rem] text-ink-tertiary">{footer}</p>
    </div>
  );
}

/**
 * The left half of the auth card.
 *
 * Kept to a headline, one sentence and three benefits. It exists to orient a
 * first-time visitor, not to sell — so it deliberately stops short of a
 * landing page, and the benefit list is hidden on mobile where vertical space
 * belongs to the form.
 */
function ProductPanel() {
  return (
    <aside className="flex flex-col border-b border-line bg-tinted px-7 py-8 md:border-r md:border-b-0 md:px-10 md:py-12">
      <BrandLockup />

      {/*
         `mt-auto` bottom-anchors the block on tall panels, but it replaces
         the margin entirely — so the minimum gap lives on the inner wrapper
         as padding, which keeps the headline off the logo mark at any height.
      */}
      <div className="mt-auto pt-10">
        <h2 className="text-[1.375rem] leading-[1.25] font-semibold tracking-[-0.025em] text-ink md:text-[1.5rem]">
          Turn your sources into conversations.
        </h2>

        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-secondary">
          Mindora is a research companion. Gather what you are reading, then
          talk to it grounded, cited, and available whenever you need it
          again.
        </p>

        <ul className="mt-7 hidden space-y-5 md:block">
          <Benefit
            icon={<FileTextIcon className="size-3.5" />}
            title="Bring your sources"
            body="PDFs, websites and videos together in one organised notebook."
          />
          <Benefit
            icon={<MessagesSquareIcon className="size-3.5" />}
            title="Chat with citations"
            body="Ask anything and get answers that point back to the exact passage."
          />
          <Benefit
            icon={<LayersIcon className="size-3.5" />}
            title="Keep every conversation"
            body="Chats are saved per notebook, so you can pick up any thread you started."
          />
        </ul>
      </div>
    </aside>
  );
}

function Benefit({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="mt-px flex size-7 shrink-0 items-center justify-center rounded-md bg-surface text-ink-secondary ring-1 ring-line"
      >
        {icon}
      </span>

      <span className="min-w-0">
        <span className="block text-[0.8125rem] font-medium text-ink">
          {title}
        </span>
        <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-ink-tertiary">
          {body}
        </span>
      </span>
    </li>
  );
}