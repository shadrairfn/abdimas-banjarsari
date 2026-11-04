import { useCallback, useEffect, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "app_theme";
const SERVER_THEME: Theme = "light";
const themeListeners = new Set<() => void>();

function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);

  return () => {
    themeListeners.delete(listener);
  };
}

// The saved choice wins, otherwise follow the operating system.
function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    // Storage can be blocked by the browser, then the system preference is used.
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The theme still changes for this visit even if it cannot be remembered.
  }

  themeListeners.forEach((listener) => listener());
}

/** Light/dark theme stored in localStorage and mirrored to the `dark` class on <html>. */
export function useTheme() {
  // The server cannot know the visitor's theme, so it renders "light" and the client corrects it.
  const theme = useSyncExternalStore<Theme>(subscribeToTheme, readTheme, () => SERVER_THEME);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    saveTheme(readTheme() === "dark" ? "light" : "dark");
  }, []);

  return { theme, toggleTheme };
}
