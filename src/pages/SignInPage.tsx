import { SignIn } from "@clerk/clerk-react";
import { useMemo } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthSplash } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@clerk/clerk-react";
import { useTheme } from "@/lib/useTheme";
import { clerkAppearance } from "@/lib/clerkAppearance";
import { cn } from "@/lib/utils";

export default function SignInPage() {
  const { isLoaded } = useAuth();
  const { resolvedTheme } = useTheme();

  // Clerk needs literal colours, so its appearance is rebuilt per theme.
  // Memoised to keep the object identity stable across renders.
  const appearance = useMemo(
    () => clerkAppearance(resolvedTheme === "dark"),
    [resolvedTheme],
  );

  if (!isLoaded) return <AuthSplash label="Loading sign in" />;

  return (
    <AuthLayout>
      <AuthTabs active="signin" />
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/workspace"
        appearance={appearance}
      />
    </AuthLayout>
  );
}

/**
 * Segmented sign-in / sign-up control.
 *
 * Clerk's own segmented control is hidden in `appearance`; this reproduces it
 * with plain links so navigation stays a real page transition. The active
 * pill is raised with a hairline rather than a filled blue background — the
 * accent belongs to the submit button, not the switcher.
 */
export function AuthTabs({ active }: { active: "signin" | "signup" }) {
  return (
    <div
      role="tablist"
      aria-label="Authentication"
      className="mb-7 grid grid-cols-2 gap-1 rounded-lg bg-tinted p-1"
    >
      <AuthTab active={active === "signin"} href="/sign-in">
        Sign in
      </AuthTab>
      <AuthTab active={active === "signup"} href="/sign-up">
        Sign up
      </AuthTab>
    </div>
  );
}

function AuthTab({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      role="tab"
      aria-selected={active}
      className={cn(
        "rounded-md py-2 text-center text-sm font-medium",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
        active
          ? "bg-surface text-ink shadow-subtle ring-1 ring-line"
          : "text-ink-secondary hover:bg-surface/60 hover:text-ink",
      )}
    >
      {children}
    </a>
  );
}