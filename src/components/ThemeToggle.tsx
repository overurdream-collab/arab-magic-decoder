import { useSyncExternalStore } from "react";
import { useHydrated } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { getServerTheme, getTheme, setTheme, subscribeTheme } from "@/lib/theme-store";

/**
 * Light/dark switch. The theme lives in <html data-theme> (see lib/theme-store),
 * so the toggle and the root shell always show the same state.
 */
export function ThemeToggle() {
  const hydrated = useHydrated();
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme);
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "التبديل إلى المظهر الفاتح" : "التبديل إلى المظهر الداكن"}
      title={dark ? "المظهر الفاتح" : "المظهر الداكن"}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary-foreground/10 text-secondary-foreground transition hover:bg-secondary-foreground/20"
    >
      {hydrated ? (
        dark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )
      ) : (
        <span className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
