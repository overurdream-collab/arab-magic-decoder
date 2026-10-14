import { useEffect, useState } from "react";
import { useHydrated } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";

export const THEME_STORAGE_KEY = "qitaa-theme";
export type Theme = "light" | "dark";

/**
 * Reads the theme the pre-paint script already applied. It uses the
 * `data-theme` attribute rather than a class because React never renders that
 * attribute, so setting it early can't cause a hydration mismatch.
 */
function readAppliedTheme(): Theme {
  return typeof document !== "undefined" && document.documentElement.dataset.theme === "dark"
    ? "dark"
    : "light";
}

/**
 * Light/dark switch. The choice is written to localStorage and to
 * <html data-theme>; the stylesheet keys every colour token off that attribute.
 */
export function ThemeToggle() {
  const hydrated = useHydrated();
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    if (hydrated) setTheme(readAppliedTheme());
  }, [hydrated]);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked (private mode) — the switch still applies for this visit.
    }
  }

  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
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
