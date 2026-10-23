import { useState } from "react";
import { useForm, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeftIcon,
  FileTextIcon,
  Loader2Icon,
  UploadIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/layout/ErrorState";
import {
  SOURCE_KINDS,
  renderKindIcon,
  sourceKindMeta,
  type AddSourceKind,
} from "@/lib/sources";
import { fileSize, isValidHttpUrl } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AddSourceInput } from "@/hooks/useNotebook";

/** Mirrors the backend's 10 MB multer limit. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 200_000;

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give this source a title.")
    .max(120, "Keep the title under 120 characters."),
  url: z.string().optional(),
  content: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

/** `"picker"` is the type-selection screen, not a source kind. */
type Step = AddSourceKind | "picker";

export function AddSourceDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (input: AddSourceInput) => Promise<void>;
}) {
  const [step, setStep] = useState<Step>("picker");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", url: "", content: "" },
  });

  const busy = isSubmitting;
  const isPicker = step === "picker";
  // Lookup during render is fine; constructing elements is not.
  const meta = sourceKindMeta(isPicker ? "file" : step);

  const chooseKind = (next: AddSourceKind) => {
    setStep(next);
    setFile(null);
    setFileError(null);
    setSubmitError(null);
    // Clear fields that do not apply to the chosen kind.
    reset({ title: "", url: "", content: "" });
  };

  const handleFile = (selected: File | null) => {
    setFileError(null);

    if (!selected) {
      setFile(null);
      return;
    }

    if (selected.type !== "application/pdf") {
      setFile(null);
      setFileError("Only PDF files are supported.");
      return;
    }

    if (selected.size > MAX_FILE_BYTES) {
      setFile(null);
      setFileError(
        `That file is ${fileSize(selected.size)}. The limit is ${fileSize(MAX_FILE_BYTES)}.`,
      );
      return;
    }

    setFile(selected);
    // Prefill the title from the filename; still fully editable.
    reset({ ...getValues(), title: selected.name.replace(/\.pdf$/i, "") });
  };

  const onSubmit = handleSubmit(async (values) => {
    if (isPicker) return;
    setSubmitError(null);

    try {
      switch (step) {
        case "file": {
          if (!file) {
            setFileError("Choose a PDF to upload.");
            return;
          }
          await onAdd({ kind: "file", file, title: values.title.trim() });
          break;
        }
        case "website":
        case "youtube": {
          const url = (values.url ?? "").trim();
          if (!isValidHttpUrl(url)) {
            setSubmitError("Enter a valid http or https URL.");
            return;
          }
          await onAdd({ kind: step, url, title: values.title.trim() });
          break;
        }
        case "text": {
          const content = (values.content ?? "").trim();
          if (!content) {
            setSubmitError("Paste some text to add as a source.");
            return;
          }
          await onAdd({ kind: "text", title: values.title.trim(), content });
          break;
        }
      }
      onOpenChange(false);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "We could not add that source.",
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isPicker ? "Add a source" : meta.label}
          </DialogTitle>
          <DialogDescription>
            {isPicker
              ? "Answers in this notebook are grounded only in the sources you add."
              : meta.description}
          </DialogDescription>
        </DialogHeader>

        {isPicker ? (
          <ul role="list" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SOURCE_KINDS.map(({ kind, label, description }) => (
              <li key={kind}>
                <SourceKindOption
                  kind={kind}
                  label={label}
                  description={description}
                  onSelect={() => chooseKind(kind)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <form
            id="add-source-form"
            onSubmit={onSubmit}
            className="space-y-4"
            noValidate
          >
            <TitleField
              kind={step}
              errors={errors.title?.message}
              register={register}
              busy={busy}
            />

            {step === "file" ? (
              <FileField
                file={file}
                error={fileError}
                busy={busy}
                onFile={handleFile}
              />
            ) : null}

            {step === "website" || step === "youtube" ? (
              <UrlField
                kind={step}
                register={register}
                busy={busy}
              />
            ) : null}

            {step === "text" ? (
              <TextField register={register} busy={busy} />
            ) : null}

            {submitError ? (
              <ErrorState
                compact
                title="Could not add source"
                message={submitError}
              />
            ) : null}
          </form>
        )}

        <DialogFooter className="sm:justify-between">
          {isPicker ? (
            <span className="text-[0.75rem] text-ink-tertiary">
              Uploads stay private to your notebook.
            </span>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep("picker")}
              disabled={busy}
              className="mr-auto"
            >
              <ArrowLeftIcon />
              All sources
            </Button>
          )}

          {isPicker ? null : (
            <Button type="submit" form="add-source-form" size="sm" disabled={busy}>
              {busy ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Adding
                </>
              ) : (
                "Add source"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TitleField({
  kind,
  errors,
  register,
  busy,
}: {
  kind: AddSourceKind;
  errors?: string;
  register: UseFormRegister<FormValues>;
  busy: boolean;
}) {
  const placeholder =
    kind === "text" ? "Meeting notes" : kind === "file" ? "system-design" : "Article title";

  return (
    <div className="space-y-2">
      <Label htmlFor="source-title">Title</Label>
      <Input
        id="source-title"
        autoFocus
        autoComplete="off"
        maxLength={120}
        placeholder={placeholder}
        disabled={busy}
        aria-invalid={Boolean(errors)}
        aria-describedby={errors ? "source-title-error" : undefined}
        className="h-9 bg-surface"
        {...register("title")}
      />
      {errors ? (
        <p id="source-title-error" role="alert" className="text-[0.8125rem] text-danger">
          {errors}
        </p>
      ) : null}
    </div>
  );
}

function FileField({
  file,
  error,
  busy,
  onFile,
}: {
  file: File | null;
  error: string | null;
  busy: boolean;
  onFile: (file: File | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="source-file">PDF file</Label>
      <input
        id="source-file"
        type="file"
        accept="application/pdf"
        disabled={busy}
        className="sr-only"
        onChange={(event) => onFile(event.target.files?.[0] ?? null)}
      />
      <label
        htmlFor="source-file"
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line-strong bg-sunken px-3.5 py-4",
          "transition-colors hover:border-accent hover:bg-accent-soft/40",
          "focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25",
          error && "border-danger/50",
          busy && "pointer-events-none opacity-60",
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-ink-secondary"
        >
          {file ? <FileTextIcon className="size-4" /> : <UploadIcon className="size-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.8125rem] font-medium text-ink">
            {file ? file.name : "Choose a PDF"}
          </span>
          <span className="mt-0.5 block text-[0.75rem] text-ink-tertiary">
            {file ? fileSize(file.size) : `Up to ${fileSize(MAX_FILE_BYTES)}`}
          </span>
        </span>
      </label>
      {error ? (
        <p role="alert" className="text-[0.8125rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function UrlField({
  kind,
  register,
  busy,
}: {
  kind: "website" | "youtube";
  register: UseFormRegister<FormValues>;
  busy: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="source-url">
        {kind === "youtube" ? "YouTube URL" : "Website URL"}
      </Label>
      <Input
        id="source-url"
        type="url"
        inputMode="url"
        autoComplete="off"
        placeholder={
          kind === "youtube"
            ? "https://www.youtube.com/watch?v=..."
            : "https://example.com/article"
        }
        disabled={busy}
        className="h-9 bg-surface"
        {...register("url")}
      />
      <p className="text-[0.75rem] text-ink-tertiary">
        {kind === "youtube"
          ? "The video transcript is extracted and indexed."
          : "Readable article text is extracted from the page."}
      </p>
    </div>
  );
}

function TextField({
  register,
  busy,
}: {
  register: UseFormRegister<FormValues>;
  busy: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="source-content">Text</Label>
      {/*
        The base Textarea sets `field-sizing-content`, which sizes the control
        to its content in BOTH axes. A pasted blob with no spaces -- a long
        URL, a base64 string, a run of one repeated character -- has a huge
        max-content width, so the field grows to ~7000px, drags the whole
        form with it, and every `w-full` sibling (including the Title input)
        inherits that width and spills outside the dialog.

        `field-sizing-fixed` opts this field out of content sizing entirely:
        the box stays exactly as wide as its container and as tall as `rows`,
        and long content scrolls inside it instead. `max-h` then bounds it on
        short viewports, and `resize-none` stops the drag handle from
        reintroducing the same overflow.
      */}
      <Textarea
        id="source-content"
        rows={7}
        maxLength={MAX_TEXT_CHARS}
        placeholder="Paste notes, an excerpt, or any text you want to ask about…"
        disabled={busy}
        className="field-sizing-fixed max-h-64 min-h-32 w-full resize-none overflow-y-auto overflow-x-hidden break-words bg-surface text-[0.8125rem] leading-relaxed"
        {...register("content")}
      />
    </div>
  );
}

function SourceKindOption({
  kind,
  label,
  description,
  onSelect,
}: {
  kind: AddSourceKind;
  label: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border border-line bg-surface p-3.5 text-left",
        "transition-[border-color,box-shadow,transform] duration-150",
        "hover:-translate-y-0.5 hover:border-line-strong hover:shadow-raised",
        "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25",
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-sunken text-ink-secondary"
      >
        {renderKindIcon(kind)}
      </span>
      <span className="min-w-0">
        <span className="block text-[0.8125rem] font-medium text-ink">
          {label}
        </span>
        <span className="mt-0.5 block text-[0.75rem] text-ink-tertiary">
          {description}
        </span>
      </span>
    </button>
  );
}
