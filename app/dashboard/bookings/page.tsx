"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  dashboardApi,
  dispatcherApi,
  queryKeys,
  type AdminBooking,
  type AdminBookingStatus,
  type PartnerRow,
} from "@/src/api/api";
import { ApiError } from "@/src/api/apiClient";
import { hasPermission } from "@/src/lib/auth";
import { BagIcon, SearchIcon, SpinnerIcon, UsersIcon } from "@/src/components/icons";

const PAGE_SIZE = 20;

const TABS: { key: AdminBookingStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

/** Tailwind classes per booking status badge. */
const STATUS_STYLES: Record<AdminBookingStatus, string> = {
  PENDING: "bg-warning/10 text-warning",
  ASSIGNED: "bg-primary/10 text-primary",
  ACCEPTED: "bg-primary/10 text-primary",
  ON_THE_WAY: "bg-primary/10 text-primary",
  IN_PROGRESS: "bg-primary/10 text-primary",
  COMPLETED: "bg-success/10 text-success",
  CANCELLED: "bg-danger/10 text-danger",
};

function prettyStatus(status: AdminBookingStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** A booking is allocatable when no partner has taken it and it isn't finished. */
function canAllocate(b: AdminBooking): boolean {
  return !b.professionalId && b.status !== "COMPLETED" && b.status !== "CANCELLED";
}

export default function BookingsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AdminBookingStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [allocating, setAllocating] = useState<AdminBooking | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [canManage, setCanManage] = useState(false);
  useEffect(() => setCanManage(hasPermission("bookings.update")), []);

  // Reset to the first page whenever the filter or search changes.
  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  const params = {
    status: tab === "ALL" ? undefined : tab,
    search: search.trim() || undefined,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.adminBookings(params),
    queryFn: () => dashboardApi.listBookings(params),
    placeholderData: keepPreviousData,
  });

  const counts = data?.counts;
  const pagination = data?.pagination;
  const bookings = data?.bookings ?? [];
  const showActions = canManage;

  const from = pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const to = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          The complete booking history across all customers and services.
        </p>
      </div>

      {notice ? (
        <div className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success">{notice}</div>
      ) : null}

      {/* Tabs + search */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => {
            const count = t.key === "ALL" ? counts?.all : counts?.[t.key];
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative -mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                <sup className="ml-1 text-xs">({count ?? 0})</sup>
              </button>
            );
          })}
        </div>

        <div className="relative w-full max-w-xs pb-2">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, mobile, booking ID or date"
            className="w-full rounded-xl border border-border bg-card py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="flex h-60 items-center justify-center text-muted-foreground">
            <SpinnerIcon className="h-6 w-6" />
          </div>
        ) : isError ? (
          <div className="flex h-60 flex-col items-center justify-center gap-3 text-center">
            <p className="text-muted-foreground">Couldn’t load bookings.</p>
            <button
              onClick={() => refetch()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Retry
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center gap-3 text-center">
            <BagIcon className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {search || tab !== "ALL"
                ? "No bookings match this filter."
                : "No bookings yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Booking</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Mobile</th>
                  <th className="px-5 py-3 font-medium">Service</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Payment</th>
                  <th className="px-5 py-3 font-medium">Partner</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  {showActions && <th className="px-5 py-3 text-right font-medium">Action</th>}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b: AdminBooking) => (
                  <tr
                    key={b.bookingId}
                    className="border-t border-border transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-3 font-medium text-foreground">{b.id}</td>
                    <td className="px-5 py-3 text-foreground">{b.customer}</td>
                    <td className="px-5 py-3 text-muted-foreground">{b.mobile ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{b.service}</td>
                    <td className="px-5 py-3 font-medium text-foreground">
                      ₹{b.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{b.paymentMode}</td>
                    <td className="px-5 py-3">
                      {b.professionalName ? (
                        <span className="text-foreground">{b.professionalName}</span>
                      ) : (
                        <span className="text-xs font-medium text-warning">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[b.status]}`}
                      >
                        {prettyStatus(b.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{b.date}</td>
                    {showActions && (
                      <td className="px-5 py-3 text-right">
                        {canAllocate(b) ? (
                          <button
                            onClick={() => {
                              setNotice(null);
                              setAllocating(b);
                            }}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
                          >
                            Allocate
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {pagination && bookings.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm text-muted-foreground">
            <span>
              Showing {from}–{to} of {pagination.total} bookings
              {isFetching ? " · updating…" : ""}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground transition hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
              >
                ‹ Prev
              </button>
              <span className="text-xs">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="rounded-lg border border-border px-3 py-1.5 font-medium text-foreground transition hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>

      {allocating && (
        <AllocatePartnerModal
          booking={allocating}
          onClose={() => setAllocating(null)}
          onDone={(msg) => {
            setAllocating(null);
            setNotice(msg);
            queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
          }}
        />
      )}
    </div>
  );
}

// 🧭 Pick an active partner to manually assign to an unaccepted booking.
function AllocatePartnerModal({
  booking,
  onClose,
  onDone,
}: {
  booking: AdminBooking;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PartnerRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.partners(search.trim(), "ACTIVE"),
    queryFn: () => dispatcherApi.listPartners(search.trim() || undefined, "ACTIVE"),
    placeholderData: keepPreviousData,
  });
  const partners = (data ?? []).filter((p) => !p.isBlocked);

  const allocate = useMutation({
    mutationFn: (professionalId: number) =>
      dashboardApi.allocateBooking(booking.bookingId, professionalId),
    onSuccess: (res) => onDone(res.message),
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Could not allocate partner."),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={allocate.isPending ? undefined : onClose}
        aria-hidden
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-2xl">
        <div className="border-b border-border p-5">
          <h3 className="text-lg font-semibold text-foreground">Allocate a partner</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Booking <span className="font-medium text-foreground">{booking.id}</span> ·{" "}
            {booking.service} · {booking.customer}
          </p>
        </div>

        <div className="border-b border-border p-4">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search active partners by name, mobile or city"
              autoFocus
              className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>
        </div>

        <div className="min-h-48 flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <SpinnerIcon className="h-6 w-6" />
            </div>
          ) : partners.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <UsersIcon className="h-8 w-8" />
              <p className="text-sm">No active partners found.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {partners.map((p) => {
                const isSel = selected?.professionalId === p.professionalId;
                return (
                  <li key={p.professionalId}>
                    <button
                      onClick={() => setSelected(p)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                        isSel
                          ? "border-primary bg-primary/5"
                          : "border-transparent hover:bg-muted/50"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                          {p.name}
                          <span
                            className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                              p.isOnline ? "bg-success" : "bg-muted-foreground/40"
                            }`}
                            title={p.isOnline ? "Online" : "Offline"}
                          />
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[p.category, p.city, p.mobile].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                      {isSel && <span className="shrink-0 text-xs font-semibold text-primary">Selected</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {err ? (
          <div className="border-t border-border px-5 py-3 text-sm text-danger">{err}</div>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <button
            type="button"
            onClick={onClose}
            disabled={allocate.isPending}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selected || allocate.isPending}
            onClick={() => selected && allocate.mutate(selected.professionalId)}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {allocate.isPending ? <SpinnerIcon className="h-4 w-4" /> : null}
            {selected ? `Assign ${selected.name}` : "Assign partner"}
          </button>
        </div>
      </div>
    </div>
  );
}
