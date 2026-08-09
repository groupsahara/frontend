"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { crmQueryKeys, notificationsApi, type NotificationRow } from "@/src/api/api";
import { BellIcon } from "@/src/components/icons";

/** A dot per category, so the feed is scannable without reading every line. */
const CATEGORY_TONE: Record<string, string> = {
  POLICY: "bg-primary",
  ATTENDANCE: "bg-warning",
  SHIFT: "bg-success",
  LEAVE: "bg-primary",
  GENERAL: "bg-muted-foreground",
};

/** "just now" / "3h ago" / a date once it stops being recent. */
function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

/**
 * The bell in the topbar. Polls the unread count so an attendance mark or a
 * newly published policy shows up without a reload; the full list is only
 * fetched when the panel is opened.
 */
export function NotificationBell() {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const { data } = useQuery({
    queryKey: crmQueryKeys.notifications,
    queryFn: () => notificationsApi.list(30),
    // Cheap and steady: the feed is small and this keeps the badge honest.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  // Click-away closes the panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const refresh = () => qc.invalidateQueries({ queryKey: crmQueryKeys.notifications });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: refresh,
  });
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: refresh,
  });

  const unread = data?.unreadCount ?? 0;
  const items = data?.notifications ?? [];

  const openItem = (n: NotificationRow) => {
    if (!n.readAt) markRead.mutate(n.notificationId);
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-label={unread ? `Notifications (${unread} unread)` : "Notifications"}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <BellIcon className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white ring-2 ring-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">
              Notifications{unread > 0 && ` (${unread})`}
            </span>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="text-xs font-medium text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 divide-y divide-border overflow-y-auto">
            {items.map((n) => (
              <button
                key={n.notificationId}
                onClick={() => openItem(n)}
                className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-accent ${
                  n.readAt ? "" : "bg-primary/5"
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    CATEGORY_TONE[n.category] ?? CATEGORY_TONE.GENERAL
                  } ${n.readAt ? "opacity-30" : ""}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{n.title}</span>
                  {n.body && (
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {n.body}
                    </span>
                  )}
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {ago(n.createdAt)}
                  </span>
                </span>
              </button>
            ))}
            {!items.length && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nothing yet — policy updates and attendance marks land here.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
