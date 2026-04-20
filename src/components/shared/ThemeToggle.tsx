"use client";

import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur transition hover:border-primary/40 hover:bg-card",
        className,
      )}
      aria-label="Toggle theme"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
        {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </span>
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
