"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const accessToken = useAuthStore((state) => state.accessToken);

  const logout = () => {
    // Clear Zustand auth state
    clearAuth();

    // Clear cookie (middleware reads this)
    document.cookie =
      "accessToken=; path=/; max-age=0; SameSite=Lax";

    // Redirect to login
    router.replace("/login");
  };

  const getToken = (): string | null => {
    if (accessToken) return accessToken;

    if (typeof window === "undefined") return null;
    const match = document.cookie.match(/(^|;)\s*accessToken\s*=\s*([^;]+)/);
    return match ? decodeURIComponent(match[2]) : null;
  };

  return { logout, getToken };
}