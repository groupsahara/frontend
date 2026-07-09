"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function ClientManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const user = useAuthStore(
    (state) => state.user
  );

  useEffect(() => {
    if (!user) return;

    const firstRole = user?.roles?.[0];

    const roleName =
      typeof firstRole === "string"
        ? firstRole
        : firstRole?.role?.name ||
          firstRole?.name ||
          "";

    const normalizedRole = roleName
      .toLowerCase()
      .replace(/_/g, "")
      .replace(/\s/g, "");

    if (normalizedRole !== "superadmin") {
      router.replace("/real-estate");
    }
  }, [user, router]);

  if (!user) return null;

  const firstRole = user?.roles?.[0];

  const roleName =
    typeof firstRole === "string"
      ? firstRole
      : firstRole?.role?.name ||
        firstRole?.name ||
        "";

  const normalizedRole = roleName
    .toLowerCase()
    .replace(/_/g, "")
    .replace(/\s/g, "");

  if (normalizedRole !== "superadmin") {
    return null;
  }

  return <>{children}</>;
}