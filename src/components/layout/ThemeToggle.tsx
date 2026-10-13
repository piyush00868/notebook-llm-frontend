import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/useTheme";
import { MoonIcon, SunIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

/**
 * Appearance control.
 *
 * Uses the theme's resolved state rather than reading storage or the DOM, and
 * reads `useTheme` from the app-root provider so a single instance owns the
 * `dark` class.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Appearance: ${preference}. Switch to ${isDark ? "light" : "dark"}.`}
            className={cn("size-9 text-ink-secondary", className)}
          />
        }
      >
        {isDark ? <MoonIcon className="size-4.5" /> : <SunIcon className="size-4.5" />}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          <DropdownMenuSeparator />
        </DropdownMenuGroup>
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(value) =>
            setPreference(value as typeof preference)
          }
        >
          <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}