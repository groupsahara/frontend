"use client";

import { useTheme } from "@/src/lib/theme";
import { MoonIcon, SunIcon } from "@/src/components/icons";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark blue / white theme"
      title={isDark ? "Switch to white theme" : "Switch to dark blue theme"}
      className="relative inline-flex h-9 w-16 items-center rounded-full border border-border bg-muted px-1 transition-colors"
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full bg-card text-foreground shadow-sm transition-transform duration-300 ${
          isDark ? "translate-x-7" : "translate-x-0"
        }`}
      >
        {isDark ? (
          <MoonIcon className="h-4 w-4 text-primary" />
        ) : (
          <SunIcon className="h-4 w-4 text-warning" />
        )}
      </span>
    </button>
  );
}
