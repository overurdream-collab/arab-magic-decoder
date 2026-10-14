export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "qitaa-theme";

/**
 * Pre-paint script: runs before React so a returning visitor never sees a flash
 * of the wrong theme. It only touches `data-theme`, which React then renders
 * with the same value (see getTheme), so hydration stays clean.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.dataset.theme=t;}catch(e){}})();`;

const listeners = new Set<() => void>();

/**
 * Client snapshot: prefers the attribute the pre-paint script already applied,
 * so React's first render always agrees with what is in the DOM.
 */
export function getTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const applied = document.documentElement.dataset["theme"];
  if (applied === "dark" || applied === "light") return applied;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    // Storage blocked (private mode) — fall back to the OS preference.
  }
  if (stored === "dark" || stored === "light") return stored;
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Server snapshot: the stylesheet's default (light) — the script fixes it early. */
export function getServerTheme(): Theme {
  return "light";
}

export function setTheme(next: Theme) {
  document.documentElement.dataset["theme"] = next;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Storage blocked (private mode) — the switch still applies for this visit.
  }
  for (const notify of listeners) notify();
}

export function subscribeTheme(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}
