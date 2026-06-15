"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  dashboardApi,
  queryKeys,
  type AdminBooking,
  type AdminBookingStatus,
} from "@/src/api/api";
import { BagIcon, SearchIcon, SpinnerIcon } from "@/src/components/icons";

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

export default function BookingsPage() {
  const [tab, setTab] = useState<AdminBookingStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

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
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
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
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[b.status]}`}
                      >
                        {prettyStatus(b.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{b.date}</td>
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
    </div>
  );
}
