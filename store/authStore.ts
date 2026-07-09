import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  tenantId: string | null;
  roles: any[];
  permissions: string[];
  ai_mode?: boolean;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;

  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  setAiMode: (aiMode: boolean) => void;
}

// On the server there is no localStorage; fall back to a no-op so SSR doesn't throw.
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,

      setAuth: (token, user) =>
        set({
          accessToken: token,
          user,
        }),

      clearAuth: () =>
        set({
          accessToken: null,
          user: null,
        }),

      setAiMode: (aiMode) =>
        set((state) => ({
          user: state.user ? { ...state.user, ai_mode: aiMode } : state.user,
        })),
    }),
    {
      // Persist the session so a page reload keeps the user logged in.
      name: "tsk-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    },
  ),
);

/**
 * Bridge: seed this store from the restocare PANEL session (rc.* localStorage
 * keys written by /login). The real-estate section has no login flow of its
 * own — the panel session is the source of truth; this store is a mirror the
 * ported components (usePermissions, PermissionGate, apiClient) read from.
 *
 * Panel admins hold "*" permissions → normalized to the super_admin role so
 * the reference RBAC helpers grant them everything.
 */
export function seedAuthFromPanelSession(): boolean {
  if (typeof window === "undefined") return false;

  const token = window.localStorage.getItem("rc.accessToken");
  if (!token) return false;

  let panelUser: { id?: number; email?: string | null; role?: string } | null = null;
  let permissions: string[] = [];
  try {
    panelUser = JSON.parse(window.localStorage.getItem("rc.user") ?? "null");
  } catch {
    panelUser = null;
  }
  try {
    permissions = JSON.parse(window.localStorage.getItem("rc.permissions") ?? "[]");
  } catch {
    permissions = [];
  }
  if (!panelUser) return false;

  const roles =
    panelUser.role === "SUPER_ADMIN" || permissions.includes("*")
      ? ["super_admin"]
      : [String(panelUser.role ?? "").toLowerCase()];

  useAuthStore.getState().setAuth(token, {
    id: String(panelUser.id ?? ""),
    email: panelUser.email ?? "",
    tenantId: null,
    roles,
    permissions,
  });
  return true;
}
