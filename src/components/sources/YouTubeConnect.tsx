import { useEffect, useState } from "react";
// lucide-react v1.52 no longer ships brand marks, so there is no Google or
// YouTube glyph to use. ExternalLinkIcon stands in and is honest about what
// the control does: it leaves the app.
import { ExternalLinkIcon } from "lucide-react";
import { useApi } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Google account connection for YouTube sources.
 *
 * Reading a transcript through the official Data API needs the user's own
 * OAuth token -- `captions.download` rejects API keys outright. Without a
 * connection the backend falls back to scraping, which YouTube blocks from
 * datacentre IPs, so this is what makes YouTube ingestion reliable rather
 * than a coin flip.
 *
 * The handshake is driven by the backend, which returns a consent URL that the
 * browser then navigates to.
 */
export function YouTubeConnect({ className }: { className?: string }) {
  const api = useApi();
  const [state, setState] = useState<
    "loading" | "connected" | "disconnected" | "unconfigured"
  >("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    api
      .getYouTubeConnection()
      .then((status) => {
        if (!active) return;
        setState(
          !status.configured
            ? "unconfigured"
            : status.connected
              ? "connected"
              : "disconnected",
        );
      })
      .catch(() => {
        if (active) setState("disconnected");
      });

    return () => {
      active = false;
    };
  }, [api]);

  async function connect() {
    setBusy(true);
    try {
      // Fetched with the auth header, then navigated to. A plain link would
      // arrive at the API with neither a header nor a session cookie.
      const { url } = await api.startYouTubeAuth();
      window.location.href = url;
    } catch {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await api.disconnectYouTube();
      setState("disconnected");
    } catch {
      setState("disconnected");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return (
      <p className={cn("text-[0.75rem] text-ink-tertiary", className)}>
        Checking Google connection…
      </p>
    );
  }

  if (state === "unconfigured") {
    return (
      <p className={cn("text-[0.75rem] text-ink-tertiary", className)}>
        YouTube connections are not configured on this server.
      </p>
    );
  }

  if (state === "connected") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="text-[0.75rem] text-ink-secondary">
          Google account connected
        </span>
        <button
          type="button"
          onClick={disconnect}
          disabled={busy}
          className={cn(
            "text-[0.75rem] text-ink-tertiary underline-offset-2",
            "transition-colors hover:text-ink hover:underline",
            "focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          {busy ? "Disconnecting…" : "Disconnect"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={connect}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-line bg-surface",
        "px-2.5 py-1.5 text-[0.8125rem] font-medium text-ink-secondary",
        "transition-colors hover:border-accent-border hover:bg-accent-soft hover:text-accent",
        "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25",
        "disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
    >
      <ExternalLinkIcon className="size-4" />
      {busy ? "Connecting…" : "Connect Google for YouTube"}
    </button>
  );
}