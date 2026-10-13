import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/layout/ErrorState";
import type { Notebook } from "@/types";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give your notebook a name.")
    .max(80, "Keep the name under 80 characters."),
});

type FormValues = z.infer<typeof schema>;

export function CreateNotebookDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => Promise<Notebook>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">New notebook</DialogTitle>
          <DialogDescription>
            A notebook is a private knowledge space. Its answers are grounded
            only in the sources you add to it.
          </DialogDescription>
        </DialogHeader>

        {/*
          The form lives in its own component so its state — values, errors
          and submission status — is discarded when the dialog unmounts.
        */}
        <CreateNotebookForm
          onCreate={onCreate}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function CreateNotebookForm({
  onCreate,
  onCancel,
}: {
  onCreate: (name: string) => Promise<Notebook>;
  onCancel: () => void;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const notebook = await onCreate(values.name);
      toast.success("Notebook created", {
        description: `“${notebook.name}” is ready for sources.`,
      });
      onCancel();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "We could not create that notebook.",
      );
    }
  });

  const busy = isSubmitting;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="notebook-name">Notebook name</Label>
        <Input
          id="notebook-name"
          autoFocus
          autoComplete="off"
          maxLength={80}
          placeholder="AI Engineering"
          disabled={busy}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={
            errors.name ? "notebook-name-error" : "notebook-name-hint"
          }
          className="h-9 bg-surface"
          {...register("name")}
        />
        {errors.name ? (
          <p
            id="notebook-name-error"
            role="alert"
            className="text-[0.8125rem] text-danger"
          >
            {errors.name.message}
          </p>
        ) : (
          <p id="notebook-name-hint" className="text-[0.8125rem] text-ink-tertiary">
            You can rename it later.
          </p>
        )}
      </div>

      {submitError ? (
        <ErrorState compact title="Could not create notebook" message={submitError} />
      ) : null}

      <DialogFooter className="sm:justify-end">
        <DialogClose
          render={<Button type="button" variant="ghost" size="sm" disabled={busy} />}
        >
          Cancel
        </DialogClose>
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? (
            <>
              <Loader2Icon className="animate-spin" />
              Creating
            </>
          ) : (
            "Create notebook"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}