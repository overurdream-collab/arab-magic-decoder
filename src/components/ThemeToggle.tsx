import { useEffect, useState } from "react";
import { useHydrated } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";

export const THEME_STORAGE_KEY = "qitaa-theme";

function readAppliedTheme(): "light" | "dark" {
  return typeof document !== "undefined" && document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
}

/**
 * Light/dark switch. The class on <html> is applied before paint by the inline
 * script in __root.tsx, so this component only reads it back after hydration and
 * writes the user's new choice to localStorage.
 */
export function ThemeToggle() {
  const hydrated = useHydrated();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (hydrated) setTheme(readAppliedTheme());
  }, [hydrated]);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    root.style.colorScheme = next;
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
