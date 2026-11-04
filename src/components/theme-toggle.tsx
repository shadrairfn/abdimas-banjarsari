"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/lib/theme/use-theme";

/** Icon button that switches between the light and dark theme. */
export function ThemeToggle({ className = "btn ic g" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      className={className}
      onClick={toggleTheme}
      aria-label="Tema"
      title="Tema"
    >
      <Icon className="i" />
    </button>
  );
}
