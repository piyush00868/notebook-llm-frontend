import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ConfirmRequest {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void> | void;
}

/**
 * Destructive-action confirmation.
 *
 * Replaces `window.confirm`, which cannot be styled, cannot describe the
 * consequence, and blocks the main thread. State lives in the parent so the
 * trigger stays a plain button.
 */
export function ConfirmDialog({
  request,
  onOpenChange,
}: {
  request: ConfirmRequest | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (isBusy) return;
    setError(null);
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (!request || isBusy) return;

    setIsBusy(true);
    setError(null);

    try {
      await request.onConfirm();
      setError(null);
      onOpenChange(false);
    } catch (cause) {
      // Keep the dialog open so the user can retry or cancel.
      setError(
        cause instanceof Error ? cause.message : "That did not work. Try again.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Dialog open={request !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        {request ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">{request.title}</DialogTitle>
              <DialogDescription>{request.description}</DialogDescription>
            </DialogHeader>

            {error ? (
              <p role="alert" className="text-[0.8125rem] text-danger">
                {error}
              </p>
            ) : null}

            <DialogFooter className="sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={close}
                disabled={isBusy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirm}
                disabled={isBusy}
                autoFocus
              >
                {isBusy ? <Loader2Icon className="animate-spin" /> : null}
                {request.confirmLabel}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}