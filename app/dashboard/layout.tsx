"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/src/components/dashboard/sidebar";
import { Topbar } from "@/src/components/dashboard/topbar";
import { SpinnerIcon } from "@/src/components/icons";
import { authApi } from "@/src/api/api";
import {
  clearSession,
  getSessionId,
  getStoredUser,
  isAuthenticated,
} from "@/src/lib/auth";

// No-op store: the auth snapshot only needs to be read once on the client.
const noopSubscribe = () => () => {};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  // `undefined` while we don't yet know (server render + hydration), then the
  // real boolean once the client reads localStorage. Using `undefined` as the
  // "checking" state means the redirect effect never fires on a transient value
  // during hydration — it only redirects on a confirmed `false`.
  const authed = useSyncExternalStore<boolean | undefined>(
    noopSubscribe,
    isAuthenticated,
    () => undefined,
  );
  const user = useMemo(() => (authed ? getStoredUser() : null), [authed]);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (authed === false) router.replace("/login");
  }, [authed, router]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const sessionId = getSessionId();
      if (sessionId) {
        // Best-effort server logout; never block the client redirect on it.
        await authApi.logout(sessionId).catch(() => undefined);
      }
    },
    onSettled: () => {
      clearSession();
      router.replace("/login");
    },
  });

  if (!authed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-muted-foreground">
        <SpinnerIcon className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onLogout={() => logoutMutation.mutate()}
      />

      <div className={`transition-all duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        <Topbar
          user={user}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
