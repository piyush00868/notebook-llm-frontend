import { Component, type ErrorInfo, type ReactNode } from "react";
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Shown instead of the default panel. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render errors so a failure shows a readable panel with a retry
 * instead of an empty document. Without this, any thrown error blanks the
 * whole page with no explanation.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the detail in the console for development.
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  private readonly reset = () => {
    this.setState({ error: null });
  };

  override render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (!error) return children;
    if (fallback) return fallback(error, this.reset);

    return (
      <div className="flex min-h-svh items-center justify-center bg-paper p-6">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-line bg-surface p-6 shadow-raised">
          <div className="flex items-start gap-3">
            <TriangleAlertIcon className="mt-0.5 size-5 shrink-0 text-danger" />
            <div className="min-w-0 space-y-1.5">
              <h1 className="text-base font-medium text-ink">
                Something broke
              </h1>
              <p className="text-sm leading-relaxed text-ink-secondary">
                This screen hit an unexpected error. Retrying usually clears
                it.
              </p>
            </div>
          </div>

          <pre className="scroll-subtle max-h-40 overflow-auto rounded-lg border border-line bg-sunken p-3 font-mono text-[0.75rem] leading-relaxed text-ink-secondary">
            {error.message}
          </pre>

          <div className="flex gap-2">
            <Button size="sm" onClick={this.reset}>
              <RefreshCwIcon />
              Try again
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.location.reload()}
            >
              Reload page
            </Button>
          </div>
        </div>
      </div>
    );
  }
}