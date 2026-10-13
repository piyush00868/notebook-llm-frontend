import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { BrandLockup } from "@/components/layout/Logo";

/**
 * Gate for authenticated routes.
 *
 * Renders a quiet, branded loading state while Clerk resolves the session
 * so a signed-in user never sees a flash of the sign-in page.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return <AuthSplash label="Checking your session" />;
  }

  if (!isSignedIn) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to="/sign-in" replace state={{ from: returnTo }} />;
  }

  return <>{children}</>;
}

/** Keeps signed-in users out of the auth screens. */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <AuthSplash label="Loading" />;
  if (isSignedIn) return <Navigate to="/workspace" replace />;

  return <>{children}</>;
}

export function AuthSplash({ label }: { label?: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-paper">
      <div className="animate-pulse-soft">
        <BrandLockup />
      </div>
      <p className="text-sm text-ink-tertiary" role="status" aria-live="polite">
        {label ?? "Loading"}
      </p>
    </div>
  );
}