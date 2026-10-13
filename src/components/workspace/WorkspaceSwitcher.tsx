import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/types";

/**
 * Workspace switcher.
 *
 * Only rendered when the user actually owns more than one. With a single
 * workspace it would be noise; with several it is the difference between
 * reaching your notebooks and not.
 *
 * Names are frequently identical (`"<name>'s workspace"` is generated for
 * every account), so each row carries its notebook count — otherwise several
 * entries look like duplicates and there is no way to tell them apart.
 */
export function WorkspaceSwitcher({
  workspaces,
  activeWorkspace,
  isLoading,
  onSwitch,
}: {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  onSwitch: (id: number) => void;
}) {
  if (isLoading) {
    return <Skeleton className="h-8 w-40" />;
  }

  if (workspaces.length < 2) return null;

  const activeId = activeWorkspace?.id ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="max-w-[16rem] justify-between gap-2 text-ink-secondary hover:text-ink"
          />
        }
      >
        <span className="truncate">
          {activeWorkspace?.name ?? "Select a workspace"}
        </span>
        <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-60" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="max-h-80 w-72 overflow-y-auto scroll-subtle">
        {/*
          The label and separator must sit inside a group: Base UI's
          MenuGroupLabel reads a context that only a group provides, and
          throwing here takes the whole menu down.
        */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuSeparator />
        </DropdownMenuGroup>

        {/*
          Items are direct children on purpose: Base UI registers menu items
          through a collection that does not descend into wrapper elements, so
          an extra scroll container here renders an empty menu.
        */}
        {workspaces.map((workspace) => {
          const isActive = workspace.id === activeId;
          const count = workspace.notebooks?.length ?? 0;

          return (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => onSwitch(workspace.id)}
              className="flex items-start gap-2.5 py-2"
            >
              <CheckIcon
                aria-hidden="true"
                className={cn(
                  "mt-0.5 size-3.5 shrink-0",
                  isActive ? "text-accent" : "opacity-0",
                )}
              />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.8125rem] font-medium text-ink">
                  {workspace.name}
                </span>
                <span className="mt-0.5 block text-[0.6875rem] text-ink-tertiary">
                  {count === 1 ? "1 notebook" : `${count} notebooks`}
                  {isActive ? " · Active" : ""}
                </span>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}