import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      // `bg-accent-ui` rather than `bg-muted`: muted resolves to the sunken token,
      // which in dark mode is *darker* than the card it sits on and renders
      // the placeholder at under 1:1 contrast.
      className={cn("animate-pulse rounded-md bg-accent-ui", className)}
      {...props}
    />
  )
}

export { Skeleton }
