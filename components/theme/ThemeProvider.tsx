"use client";

import type { ReactNode } from "react";

// Bridge: the restocare root layout already provides theming (data-theme
// attribute driven by src/lib/theme.tsx). The reference app used next-themes;
// this passthrough keeps ported imports working without a second theme system.
export function ThemeProvider({ children }: { children: ReactNode; [key: string]: unknown }) {
  return <>{children}</>;
}
