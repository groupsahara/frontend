"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/store/authStore";

/**
 * Normalize whatever shape `user.roles` is in into plain role-name strings.
 * Login returns roles as string[]; getMe returns [{ id, name, description }].
 */
function extractRoleNames(roles: unknown[]): string[] {
  return roles
    .map((r) => {
      if (typeof r === "string") return r;
      const obj = r as { name?: string; role?: { name?: string } };
      return obj?.role?.name || obj?.name || "";
    })
    .filter(Boolean);
}

/**
 * RBAC helpers driven by the authenticated user's effective permissions.
 *
 * `permissions` is a flat list of "module.action" strings (e.g. "roles.update")
 * computed by the backend. Super admins implicitly have everything.
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  return useMemo(() => {
    const roleNames = extractRoleNames(user?.roles ?? []);
    const isSuperAdmin = roleNames.some(
      (r) => r.toLowerCase().replace(/[_\s]/g, "") === "superadmin"
    );

    const permissions = new Set(user?.permissions ?? []);

    const has = (perm: string) => isSuperAdmin || permissions.has(perm);
    const hasAny = (perms: string[]) =>
      isSuperAdmin || perms.some((p) => permissions.has(p));
    const hasAll = (perms: string[]) =>
      isSuperAdmin || perms.every((p) => permissions.has(p));

    return {
      roleNames,
      isSuperAdmin,
      permissions: [...permissions],
      has,
      hasAny,
      hasAll,
    };
  }, [user]);
}
