"use client";

import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGateProps {
  /** Required permission(s) as "module.action" strings. */
  permission?: string | string[];
  /** When multiple are given: require all (default) or any one. */
  mode?: "all" | "any";
  /** Rendered when the user lacks the permission. Defaults to nothing. */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally renders children based on the current user's RBAC permissions.
 * Pure client-side UX gating — the backend still enforces access on every call.
 */
export function PermissionGate({
  permission,
  mode = "all",
  fallback = null,
  children,
}: PermissionGateProps) {
  const { has, hasAny, hasAll } = usePermissions();

  if (!permission) return <>{children}</>;

  const perms = Array.isArray(permission) ? permission : [permission];
  const allowed =
    perms.length === 1
      ? has(perms[0])
      : mode === "any"
        ? hasAny(perms)
        : hasAll(perms);

  return <>{allowed ? children : fallback}</>;
}

export default PermissionGate;
