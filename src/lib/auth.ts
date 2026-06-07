"use client";

import { clearToken, getToken, setToken } from "@/src/api/apiClient";
import type { AdminUser } from "@/src/api/api";

const SESSION_KEY = "rc.sessionId";
const USER_KEY = "rc.user";

/** Persist the auth result from a successful login. */
export function persistSession(params: {
  accessToken: string;
  sessionId: string;
  user: AdminUser;
}) {
  setToken(params.accessToken);
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
  clearToken();
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}
