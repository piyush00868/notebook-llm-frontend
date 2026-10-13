import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-base text-ink transition-colors outline-none placeholder:text-ink-tertiary hover:border-line-strong focus-visible:border-accent/55 focus-visible:ring-2 focus-visible:ring-accent/12 disabled:cursor-not-allowed disabled:bg-sunken disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
