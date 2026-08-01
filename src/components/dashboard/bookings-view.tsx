"use client";

/**
 * The bookings table, shared by BOTH routes:
 *   /dashboard/bookings      (admin panel)
 *   /dashboard/crm/bookings  (CRM section)
 *
 * They used to be separate implementations with different columns and a
 * different API, so the same booking looked different depending on where you
 * opened it. One component means one data source and one format — anything
 * added here shows up in both places automatically.
 */

import { Fragment, useEffect, useState, type ReactNode } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  crmApi,
  dashboardApi,
  dispatcherApi,
  queryKeys,
  type AdminBooking,
  type AdminBookingStatus,
  type PartnerRow,
} from "@/src/api/api";
import { ApiError, API_BASE_URL } from "@/src/api/apiClient";
import { hasPermission } from "@/src/lib/auth";
import {
  BagIcon,
  ChevronDownIcon,
  SearchIcon,
  SpinnerIcon,
  TrashIcon,
  UsersIcon,
} from "@/src/components/icons";

const PAGE_SIZE = 20;

/** Filter tabs. "OUT_OF_ZONE" is not a status — it filters bookings placed
 *  outside every active service zone (the "coming soon in your area" demand). */
type BookingTab = AdminBookingStatus | "ALL" | "OUT_OF_ZONE";

const TABS: { key: BookingTab; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "OUT_OF_ZONE", label: "Coming Soon" },
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

/** Tailwind classes per slot day-part chip. */
const PERIOD_STYLES: Record<string, string> = {
  Morning: "bg-amber-500/10 text-amber-600",
  Afternoon: "bg-sky-500/10 text-sky-600",
  Evening: "bg-indigo-500/10 text-indigo-600",
  Night: "bg-slate-500/10 text-slate-500",
};

/** "19:00" → "7:00 PM"; tolerates the "24:00" midnight end our slots use. */
function formatTime(t: string | null): string {
  if (!t) return "";
  const [hStr, mStr = "00"] = t.split(":");
  const raw = Number(hStr);
  if (!Number.isFinite(raw)) return t;
  const h = ((raw % 24) + 24) % 24;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${period}`;
}

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

/** Completed bookings — old or new — can have their invoice downloaded. The
 *  invoice is rendered on demand from the booking, so no stored document or
 *  creation date is required. */
function openInvoice(bookingId: number): void {
  window.open(`${API_BASE_URL}/v1/booking/${bookingId}/invoice`, "_blank", "noopener,noreferrer");
}

export function BookingsView() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<BookingTab>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [allocating, setAllocating] = useState<AdminBooking | null>(null);
  // Rows expanded to reveal every field the API returns.
  // Cancelling from the panel captures a reason, which is stored on the booking
  // and shown in the table — otherwise a cancellation has no explanation.
  const [cancelTarget, setCancelTarget] = useState<AdminBooking | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminBooking | null>(null);
  const [cancelChoice, setCancelChoice] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const toggleExpanded = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const [notice, setNotice] = useState<string | null>(null);
  // Date-range filter (by booking date), "YYYY-MM-DD" or "" when unset.
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [canManage, setCanManage] = useState(false);
  useEffect(() => setCanManage(hasPermission("bookings.update")), []);

  // Reset to the first page whenever the filter, search or date range changes.
  useEffect(() => {
    setPage(1);
  }, [tab, search, dateFrom, dateTo]);

  const params = {
    status: tab === "ALL" || tab === "OUT_OF_ZONE" ? undefined : tab,
    outOfServiceArea: tab === "OUT_OF_ZONE" ? true : undefined,
    search: search.trim() || undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.adminBookings(params),
    queryFn: () => dashboardApi.listBookings(params),
    placeholderData: keepPreviousData,
  });

  const deleteBooking = useMutation({
    mutationFn: (id: number) => crmApi.deleteBooking(id),
    onSuccess: () => {
      setDeleteTarget(null);
      setNotice("Booking deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
    },
    onError: (e) => {
      setDeleteTarget(null);
      setNotice(e instanceof ApiError ? e.message : "Could not delete the booking.");
    },
  });

  const cancelBooking = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      crmApi.updateBookingStatus(id, "CANCELLED", reason),
    onSuccess: () => {
      setCancelTarget(null);
      setNotice("Booking cancelled.");
      queryClient.invalidateQueries({ queryKey: ["admin", "bookings"] });
    },
    onError: (e) => {
      setCancelTarget(null);
      setNotice(e instanceof ApiError ? e.message : "Could not cancel the booking.");
    },
  });

  const counts = data?.counts;
  const pagination = data?.pagination;
  const bookings = data?.bookings ?? [];
  const showActions = canManage;

  const from = pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const to = pagination ? Math.min(pagination.page * pagination.limit, pagination.total) : 0;

  return (
    <div className="mx-auto max-w-10xl space-y-6">
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
            const count =
              t.key === "ALL"
                ? counts?.all
                : t.key === "OUT_OF_ZONE"
                  ? counts?.outOfServiceArea
                  : counts?.[t.key];
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

        <div className="relative w-full max-w-sm pb-2">
          <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, mobile, booking ID or date"
            className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      {/* Date-range filter (by booking date) */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="date-from" className="text-xs font-medium text-muted-foreground">
            From date
          </label>
          <input
            id="date-from"
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="date-to" className="text-xs font-medium text-muted-foreground">
            To date
          </label>
          <input
            id="date-to"
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>
        {(dateFrom || dateTo) && (
          <>
            <button
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              Clear dates
            </button>
            <span className="pb-2 text-xs text-muted-foreground">
              {dateFrom && dateTo
                ? `Showing bookings from ${dateFrom} to ${dateTo}`
                : dateFrom
                  ? `Showing bookings on/after ${dateFrom}`
                  : `Showing bookings on/before ${dateTo}`}
            </span>
          </>
        )}
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
                  <th className="py-3 pl-4 pr-0 font-medium" />
                  <th className="px-5 py-3 font-medium">Booking</th>
                  <th className="px-5 py-3 font-medium">Restaurant</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">GST</th>
                  <th className="px-5 py-3 font-medium">Mobile</th>
                  <th className="px-5 py-3 font-medium">Service</th>
                  <th className="px-5 py-3 font-medium">Slot / Shift</th>
                  <th className="px-5 py-3 font-medium">Area</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Payment</th>
                  <th className="px-5 py-3 font-medium">Partner</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="w-px whitespace-nowrap px-5 py-3 font-medium">Date</th>
                  <th className="w-px whitespace-nowrap py-3 pl-2 pr-5 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b: AdminBooking) => {
                  const isOpen = expanded.has(b.bookingId);
                  return (
                  <Fragment key={b.bookingId}>
                  <tr
                    className="border-t border-border transition-colors hover:bg-muted/40"
                  >
                    <td className="py-3 pl-4 pr-0 align-top">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(b.bookingId)}
                        aria-expanded={isOpen}
                        title={isOpen ? "Hide full details" : "Show full details"}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <ChevronDownIcon
                          className={`h-4 w-4 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                        />
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-medium text-foreground">{b.id}</td>
                    {/* Business profile captured at checkout, split into its own
                        columns: the restaurant, who owns it, and its GST. */}
                    <td className="whitespace-nowrap px-5 py-3 text-foreground">{b.restaurantName ?? "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{b.customer}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{b.gstNumber ?? "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{b.mobile ?? "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">{b.service}</td>
                    <td className="px-5 py-3">
                      {b.startTime || b.shift ? (
                        <div className="flex max-w-[15rem] flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {b.slotPeriod && (
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                  PERIOD_STYLES[b.slotPeriod] ?? "bg-muted text-muted-foreground"
                                }`}
                              >
                                {b.slotPeriod}
                              </span>
                            )}
                            {b.startTime && (
                              <span className="text-xs text-foreground">
                                {formatTime(b.startTime)}
                                {b.endTime ? ` – ${formatTime(b.endTime)}` : ""}
                              </span>
                            )}
                          </div>
                          {b.shift && (
                            <span className="truncate text-xs text-muted-foreground" title={b.shift}>
                              {b.shift}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex max-w-[14rem] flex-col gap-1">
                        <span className="truncate text-foreground" title={b.address ?? undefined}>
                          {b.city || "—"}
                        </span>
                        {b.outOfServiceArea && (
                          <span
                            className="inline-flex w-fit items-center rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning"
                            title="Placed outside every active service zone — recorded as demand, shown to the customer as “Coming soon in your area” and not dispatched to a partner."
                          >
                            Coming soon · out of zone
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-medium text-foreground">
                      ₹{b.amount.toLocaleString("en-IN")}
                      {/* Older bookings stored a pre-tax total and have no split. */}
                      {b.taxAmount != null && b.baseAmount != null && (
                        <div
                          className="text-[11px] font-normal text-muted-foreground"
                          title={`Base ₹${b.baseAmount.toLocaleString("en-IN")} + GST ₹${b.taxAmount.toLocaleString("en-IN")}`}
                        >
                          incl. GST ₹{b.taxAmount.toLocaleString("en-IN")}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{b.paymentMode}</td>
                    <td className="px-5 py-3">
                      {b.professionalName ? (
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">{b.professionalName}</span>
                          {b.assignmentSource && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                b.assignmentSource === "MANUAL"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-success/10 text-success"
                              }`}
                              title={
                                b.assignmentSource === "MANUAL"
                                  ? "Allocated manually by an admin"
                                  : "Accepted from the auto-allocation broadcast"
                              }
                            >
                              {b.assignmentSource === "MANUAL" ? "Manual" : "Auto"}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-warning">Unassigned</span>
                      )}
                      {/* Declines explain WHY a lead is still unassigned, instead
                          of it looking like nobody was ever asked. */}
                      {b.rejectionCount > 0 && (
                        <div
                          className="mt-1 cursor-help text-[11px] font-medium text-danger"
                          title={b.rejections
                            .map(
                              (r) =>
                                `${r.professionalName}${r.reason ? ` — ${r.reason}` : ""} (${new Date(
                                  r.rejectedAt,
                                ).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })})`,
                            )
                            .join("\n")}
                        >
                          ✕ Rejected by {b.rejectionCount}{" "}
                          {b.rejectionCount === 1 ? "partner" : "partners"}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 align-top">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[b.status]}`}
                      >
                        {prettyStatus(b.status)}
                      </span>
                      {b.status === "CANCELLED" && (
                        <div className="mt-1 max-w-[200px] text-[11px] text-danger">
                          {b.cancelledAt && (
                            <div className="whitespace-nowrap">
                              {new Date(b.cancelledAt).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Asia/Kolkata",
                              })}
                            </div>
                          )}
                          {b.cancellationReason && (
                            <div
                              className="line-clamp-2 text-muted-foreground"
                              title={b.cancellationReason}
                            >
                              “{b.cancellationReason}”
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="w-px whitespace-nowrap px-5 py-3 text-muted-foreground">
                      <div>{b.date}</div>
                      <div className="text-[11px]">
                        Created{" "}
                        {new Date(b.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          timeZone: "Asia/Kolkata",
                        })}
                      </div>
                    </td>
                    <td className="w-px py-3 pl-2 pr-5">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {b.status === "COMPLETED" && (
                          <button
                            onClick={() => openInvoice(b.bookingId)}
                            title="Download the invoice (PDF)"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent"
                          >
                            🧾 Invoice
                          </button>
                        )}
                        {showActions && canAllocate(b) ? (
                          <button
                            onClick={() => {
                              setNotice(null);
                              setAllocating(b);
                            }}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
                          >
                            Allocate
                          </button>
                        ) : null}
                        {showActions && (
                          <button
                            onClick={() => {
                              setNotice(null);
                              setDeleteTarget(b);
                            }}
                            title="Delete this booking"
                            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-danger/10 hover:text-danger"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                        {/* Cancelling asks for a reason, stored on the booking
                            and shown in this table. */}
                        {showActions && b.status !== "COMPLETED" && b.status !== "CANCELLED" ? (
                          <button
                            onClick={() => {
                              setNotice(null);
                              setCancelChoice(null);
                              setCancelReason("");
                              setCancelTarget(b);
                            }}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/10"
                          >
                            Cancel
                          </button>
                        ) : null}
                        {!showActions && b.status !== "COMPLETED" ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {isOpen && <BookingDetailsRow booking={b} />}
                  </Fragment>
                  );
                })}
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

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteTarget(null)}
            aria-hidden
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-foreground">Delete {deleteTarget.id}?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {deleteTarget.restaurantName ? `${deleteTarget.restaurantName} · ` : ""}
              {deleteTarget.customer} · ₹{deleteTarget.amount.toLocaleString("en-IN")}
            </p>
            <p className="mt-3 text-sm text-danger">
              This permanently removes the booking and its rejection history. It cannot be undone.
              {deleteTarget.status === "COMPLETED"
                ? " Completed bookings are refused — cancel it instead."
                : ""}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                Keep it
              </button>
              <button
                onClick={() => deleteBooking.mutate(deleteTarget.bookingId)}
                disabled={deleteBooking.isPending}
                className="flex items-center gap-2 rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {deleteBooking.isPending && <SpinnerIcon className="h-4 w-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <CancelBookingDialog
          booking={cancelTarget}
          choice={cancelChoice}
          onChoiceChange={setCancelChoice}
          reason={cancelReason}
          onReasonChange={setCancelReason}
          busy={cancelBooking.isPending}
          onClose={() => setCancelTarget(null)}
          onConfirm={() => {
            if (!cancelTarget || !cancelChoice) return;
            const note = cancelReason.trim();
            // "Other" stores just the note; a preset stores the preset plus any note.
            const reason =
              cancelChoice === "Other" ? note : note ? `${cancelChoice} — ${note}` : cancelChoice;
            cancelBooking.mutate({ id: cancelTarget.bookingId, reason });
          }}
        />
      )}
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

/* ------------------------ Expanded "complete data" ----------------------- */

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-foreground">{children}</dd>
    </div>
  );
}

/** IST throughout — the business timezone the backend reports in. */
function istDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Everything the columns can't fit, so a booking's full record is visible
 * without leaving the table. Identical in the admin and CRM tabs.
 */
function BookingDetailsRow({ booking: b }: { booking: AdminBooking }) {
  return (
    <tr className="border-t border-border bg-muted/30">
      <td />
      <td colSpan={14} className="px-5 pb-5 pt-1">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Restaurant">{b.restaurantName ?? "—"}</Detail>
          <Detail label="Owner">{b.customer}</Detail>
          <Detail label="GST number">{b.gstNumber ?? "—"}</Detail>
          <Detail label="Mobile">{b.mobile ?? "—"}</Detail>

          <Detail label="Service">{b.service}</Detail>
          <Detail label="Shift">{b.shift ?? "—"}</Detail>
          <Detail label="Slot">
            {b.startTime && b.endTime ? `${b.startTime} – ${b.endTime}` : "—"}
            {b.slotPeriod ? ` · ${b.slotPeriod}` : ""}
          </Detail>
          <Detail label="Payment">{b.paymentMode}</Detail>

          <Detail label="Amount paid">₹{b.amount.toLocaleString("en-IN")}</Detail>
          <Detail label="Base (pre-GST)">
            {b.baseAmount != null ? `₹${b.baseAmount.toLocaleString("en-IN")}` : "—"}
          </Detail>
          <Detail label="GST">
            {b.taxAmount != null ? `₹${b.taxAmount.toLocaleString("en-IN")}` : "—"}
          </Detail>
          <Detail label="Partner">
            {b.professionalName ?? "Unassigned"}
            {b.assignmentSource ? ` (${b.assignmentSource === "MANUAL" ? "manual" : "auto"})` : ""}
          </Detail>

          <div className="sm:col-span-2 lg:col-span-4">
            <Detail label="Service address">
              {b.address ?? "—"}
              {b.city ? ` · ${b.city}` : ""}
              {b.outOfServiceArea ? " · outside every active zone" : ""}
            </Detail>
          </div>

          <Detail label="Booked for">{b.date}</Detail>
          <Detail label="Created">{istDateTime(b.createdAt)}</Detail>
          <Detail label="Cancelled">{istDateTime(b.cancelledAt)}</Detail>
          <Detail label="Cancellation reason">
            {b.cancellationReason ? `“${b.cancellationReason}”` : "—"}
          </Detail>

          {b.rejectionCount > 0 && (
            <div className="sm:col-span-2 lg:col-span-4">
              <Detail label={`Rejected by ${b.rejectionCount}`}>
                <span className="flex flex-col gap-0.5">
                  {b.rejections.map((r) => (
                    <span key={r.rejectionId} className="text-xs text-muted-foreground">
                      {r.professionalName}
                      {r.reason ? ` — ${r.reason}` : ""} · {istDateTime(r.rejectedAt)}
                    </span>
                  ))}
                </span>
              </Detail>
            </div>
          )}
        </dl>
      </td>
    </tr>
  );
}

// Same presets the customer app offers, so cancellations from either side are
// comparable. One must be chosen — a cancellation with no reason tells
// operations nothing. "Other" requires the note.
const CANCEL_REASONS = [
  "Booked by mistake",
  "Price is too high",
  "Change of plan",
  "Booked wrong date or time",
  "Customer requested cancellation",
  "No partner available",
  "Other",
] as const;

/** Cancel a booking, capturing WHY — the reason is stored and shown in the table. */
function CancelBookingDialog({
  booking,
  choice,
  onChoiceChange,
  reason,
  onReasonChange,
  busy,
  onClose,
  onConfirm,
}: {
  booking: AdminBooking | null;
  choice: string | null;
  onChoiceChange: (v: string) => void;
  reason: string;
  onReasonChange: (v: string) => void;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!booking) return null;
  // "Other" carries only the typed note, so it must not be empty.
  const valid = choice != null && (choice !== "Other" || reason.trim().length > 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        <div className="border-b border-border p-4">
          <h3 className="text-base font-semibold text-foreground">Cancel {booking.id}?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {booking.restaurantName ? `${booking.restaurantName} · ` : ""}
            {booking.customer} · ₹{booking.amount.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="space-y-3 p-5">
          <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Reason <span className="text-danger">*</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {CANCEL_REASONS.map((r) => {
              const on = choice === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => onChoiceChange(r)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    on
                      ? "border-danger bg-danger/10 text-danger"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder={choice === "Other" ? "Tell us what happened" : "Anything to add? (optional)"}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
          <span className="block text-xs text-muted-foreground">
            Stored on the booking and shown in this table.
          </span>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border p-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            Keep it
          </button>
          <button
            onClick={onConfirm}
            disabled={busy || !valid}
            title={valid ? undefined : "Pick a reason first"}
            className="flex items-center gap-2 rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy && <SpinnerIcon className="h-4 w-4" />}
            Cancel booking
          </button>
        </div>
      </div>
    </div>
  );
}
