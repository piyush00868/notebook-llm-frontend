import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import {
  ArrowRightIcon,
  BookOpenIcon,
  MessagesSquareIcon,
  NetworkIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { BrandLockup } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Public landing page.
 *
 * Flowstep's structure: a quiet top bar, a centred hero with a pill badge, a
 * large serif headline whose second half carries the accent, a subline, one
 * primary action, then three value cards.
 *
 * The serif display face is reserved for the headline — it is what gives the
 * page its editorial, research-notebook character rather than a SaaS feel.
 */
export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();

  const primaryHref = isLoaded && isSignedIn ? "/workspace" : "/sign-up";

  return (
    <div className="flex min-h-svh flex-col bg-paper">
      <header className="z-30 border-b border-line bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-[72rem] items-center gap-3 px-4 sm:px-6">
          <Link
            to="/"
            aria-label="Mindora home"
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            <BrandLockup />
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              render={
                isLoaded && isSignedIn ? (
                  <Link to="/workspace" />
                ) : (
                  <Link to="/sign-in" />
                )
              }
            >
              {isLoaded && isSignedIn ? "Workspace" : "Sign in"}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-[72rem] px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 sm:pb-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[0.8125rem] text-ink-secondary shadow-subtle">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
            Your AI-powered research notebook
          </p>

          <h1 className="mx-auto mt-8 max-w-4xl font-display text-[2.75rem] leading-[1.08] tracking-[-0.02em] text-ink sm:text-[4rem] lg:text-[4.75rem]">
            Chat with everything{" "}
            <span className="text-accent">you read.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-secondary sm:text-[1.125rem]">
            Bring your sources together, ask questions, and get cited answers.
            Mindora turns your documents into a conversation.
          </p>

          <div className="mt-9 flex justify-center">
            <Button size="lg" render={<Link to={primaryHref} />} className="h-11 px-5">
              Get started
              <ArrowRightIcon />
            </Button>
          </div>
        </section>

        {/* Value cards */}
        <section className="mx-auto w-full max-w-[72rem] px-4 pb-20 sm:px-6 sm:pb-28">
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <ValueCard
              icon={<BookOpenIcon className="size-5" />}
              title="Unified sources"
              body="Add PDFs, websites, and YouTube videos to a single, searchable workspace."
            />
            <ValueCard
              icon={<MessagesSquareIcon className="size-5" />}
              title="Grounded chat"
              body="Ask questions and get answers with inline citations back to your sources."
            />
            <ValueCard
              icon={<NetworkIcon className="size-5" />}
              title="Saved conversations"
              body="Every chat is kept with its notebook, so you can return to any thread."
            />
          </ul>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-[72rem] flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <p className="text-[0.8125rem] text-ink-tertiary">
            Your knowledge, understood.
          </p>
          <p className="text-[0.8125rem] text-ink-tertiary">
            Private by design. Grounded in your sources.
          </p>
        </div>
      </footer>
    </div>
  );
}

function ValueCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li
      className={cn(
        "rounded-xl border border-line bg-surface p-6",
        "shadow-subtle transition-shadow duration-200 hover:shadow-raised",
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-lg bg-accent-soft text-accent"
      >
        {icon}
      </span>

      <h2 className="mt-5 text-[1.0625rem] font-semibold tracking-[-0.02em] text-ink">
        {title}
      </h2>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-secondary">
        {body}
      </p>
    </li>
  );
}