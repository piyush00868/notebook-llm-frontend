import { SignUp, useAuth } from "@clerk/clerk-react";
import { useMemo } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthSplash } from "@/components/auth/ProtectedRoute";
import { AuthTabs } from "@/pages/SignInPage";
import { useTheme } from "@/lib/useTheme";
import { clerkAppearance } from "@/lib/clerkAppearance";

/**
 * Sign-up shares the appearance tokens with sign-in.
 *
 * Sign-up additionally shows Clerk's first name, last name, username and
 * phone fields, which the Flowstep design omits. They are driven by the
 * Clerk instance's sign-up settings, not by this app — an earlier attempt to
 * hide them via `nameFieldInput` / `firstNameField` was silently ignored,
 * because those keys do not exist in this Clerk version and the name inputs
 * live in a `.cl-formFieldRow__name` wrapper with no appearance hook.
 * Toggle them in the Clerk dashboard to match the design.
 */
export default function SignUpPage() {
  const { isLoaded } = useAuth();
  const { resolvedTheme } = useTheme();

  const appearance = useMemo(
    () => clerkAppearance(resolvedTheme === "dark"),
    [resolvedTheme],
  );

  if (!isLoaded) return <AuthSplash label="Loading sign up" />;

  return (
    <AuthLayout>
      <AuthTabs active="signup" />
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/workspace"
        appearance={appearance}
      />
    </AuthLayout>
  );
}