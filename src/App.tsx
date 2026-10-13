import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import {
  AuthSplash,
  ProtectedRoute,
  PublicOnlyRoute,
} from "@/components/auth/ProtectedRoute";

/**
 * Routes are code-split so the notebook experience (chat, markdown,
 * citations) is not part of the first paint after signing in.
 */
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const SignInPage = lazy(() => import("@/pages/SignInPage"));
const SignUpPage = lazy(() => import("@/pages/SignUpPage"));
const WorkspacePage = lazy(() => import("@/pages/WorkspacePage"));
const NotebookPage = lazy(() => import("@/pages/NotebookPage"));

function AppRoutes() {
  return (
    <>
      <Routes>
        {/* Public marketing entry point. */}
        <Route path="/" element={<LandingPage />} />

        {/*
          Clerk drives multi-step flows through sub-paths, e.g.
          `/sign-up/verify-email-code` and `/sign-in/verify`. With
          `routing="path"` Clerk renders those steps in place, so the
          routes must match by prefix.

          Matching exactly `/sign-up` meant the verification step fell
          through to the catch-all below, which redirected to /workspace
          and then bounced the still-unauthenticated user to /sign-in.
          That is why sign-up appeared to stop before the code field.
        */}
        <Route
          path="/sign-in/*"
          element={
            <PublicOnlyRoute>
              <SignInPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/sign-up/*"
          element={
            <PublicOnlyRoute>
              <SignUpPage />
            </PublicOnlyRoute>
          }
        />

        <Route
          path="/workspace"
          element={
            <ProtectedRoute>
              <WorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notebook/:id"
          element={
            <ProtectedRoute>
              <NotebookPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/workspace" replace />} />
      </Routes>

      <Toaster
        position="bottom-right"
        offset={16}
        toastOptions={{
          classNames: {
            toast:
              "!rounded-lg !border-line !bg-surface !text-ink !shadow-overlay !text-sm",
            description: "!text-ink-secondary",
            actionButton: "!bg-ink !text-paper !rounded-md",
            error: "!border-danger/30",
          },
        }}
      />
    </>
  );
}

function App() {
  return (
    // ThemeProvider sits outside the router so exactly one instance owns the
    // `dark` class for the whole app, across navigations.
    <ThemeProvider>
      <BrowserRouter>
        {/* Catches render errors so a failure never presents as a blank page. */}
        <ErrorBoundary>
          <TooltipProvider>
            <Suspense fallback={<AuthSplash label="Loading" />}>
              <AppRoutes />
            </Suspense>
          </TooltipProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;