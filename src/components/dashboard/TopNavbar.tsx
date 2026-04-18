import { Menu, Moon, Sun, Bell } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export function TopNavbar({ onMenu }: { onMenu: () => void }) {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="rounded-md p-2 hover:bg-muted lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="hidden font-display text-lg font-semibold sm:block">
          Hello, {user?.displayName.split(" ")[0]} 👋
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button
          className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
        </button>
        <div className="ml-2 flex items-center gap-3 rounded-lg border border-border bg-card px-2.5 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-semibold text-primary-foreground">
            {user?.avatar}
          </div>
          <div className="hidden text-sm leading-tight sm:block">
            <div className="font-medium">{user?.displayName}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
