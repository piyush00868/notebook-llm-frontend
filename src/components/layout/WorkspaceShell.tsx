import { cn } from "@/lib/utils";

/**
 * Full-height application frame. Used by the workspace and the notebook so
 * page-level spacing stays consistent.
 */
export function WorkspaceShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-svh flex-col bg-paper", className)}>
      {children}
    </div>
  );
}