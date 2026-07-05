"use client";

import { clearAuth, getToken, setRefreshToken, setToken } from "@/src/api/apiClient";
import type { AdminUser } from "@/src/api/api";

const SESSION_KEY = "rc.sessionId";
const USER_KEY = "rc.user";
const PERMS_KEY = "rc.permissions";

/** Persist the auth result from a successful login. */
export function persistSession(params: {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  user: AdminUser;
  permissions?: string[];
}) {
  setToken(params.accessToken);
  // The refresh token is required for the silent token refresh in apiClient;
  // without it, the first 401 after the access token expires forces a logout.
  setRefreshToken(params.refreshToken);
  try {
    window.localStorage.setItem(SESSION_KEY, params.sessionId);
    window.localStorage.setItem(USER_KEY, JSON.stringify(params.user));
    // Older sessions predate the RBAC rollout: admins fall back to "*" below.
    window.localStorage.setItem(PERMS_KEY, JSON.stringify(params.permissions ?? []));
  } catch {
    /* ignore */
  }
}

/** CRM permissions of the current session ("*" = everything). */
export function getPermissions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PERMS_KEY);
    const perms = raw ? (JSON.parse(raw) as string[]) : [];
    if (perms.length > 0) return perms;
  } catch {
    /* ignore */
  }
  // Sessions stored before the permissions field existed: admins see all.
  const user = getStoredUser();
  return user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? ["*"] : [];
}

export function hasPermission(key: string): boolean {
  const perms = getPermissions();
  return perms.includes("*") || perms.includes(key);
}

export function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

export function getStoredUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function clearSession() {
  // clearAuth wipes the access token, refresh token, session id and user —
  // the same keys persistSession writes — so logout leaves nothing behind.
  clearAuth();
}
