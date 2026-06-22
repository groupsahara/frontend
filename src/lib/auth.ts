"use client";

import { clearAuth, getToken, setRefreshToken, setToken } from "@/src/api/apiClient";
import type { AdminUser } from "@/src/api/api";

const SESSION_KEY = "rc.sessionId";
const USER_KEY = "rc.user";

/** Persist the auth result from a successful login. */
export function persistSession(params: {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  user: AdminUser;
}) {
  setToken(params.accessToken);
  // The refresh token is required for the silent token refresh in apiClient;
  // without it, the first 401 after the access token expires forces a logout.
  setRefreshToken(params.refreshToken);
  try {
    window.localStorage.setItem(SESSION_KEY, params.sessionId);
    window.localStorage.setItem(USER_KEY, JSON.stringify(params.user));
  } catch {
    /* ignore */
  }
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
