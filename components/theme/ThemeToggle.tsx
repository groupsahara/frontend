"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/src/lib/theme";

// Bridge: same look as the reference toggle, driven by the restocare theme
// context (data-theme attribute, "light"/"dark" only — no "system" state).
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="h-9 w-9 rounded-full border border-transparent hover:bg-accent hover:border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      title={`Theme: ${theme}`}
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Sun className="text-lg text-foreground" />
      ) : (
        <Moon className="text-lg text-foreground" />
      )}
    </button>
  );
}
