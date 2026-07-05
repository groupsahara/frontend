"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/src/api/apiClient";
import { crmApi, crmQueryKeys } from "@/src/api/api";
import {
  Badge,
  Btn,
  Card,
  EmptyRow,
  Notice,
  PageHeader,
  TableShell,
  Tabs,
  fmtDate,
  inputCls,
  statusTone,
} from "@/src/components/crm/ui";
import { SearchIcon } from "@/src/components/icons";
import { hasPermission } from "@/src/lib/auth";

const PAGE_SIZE = 20;
const TABS = ["ALL", "PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((k) => ({
  key: k,
  label: k === "ALL" ? "All" : k.replaceAll("_", " "),
}));

export default function CrmBookingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const params = {
    search: search || undefined,
    status: tab === "ALL" ? undefined : tab,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: crmQueryKeys.crmBookings(params),
    queryFn: () => crmApi.bookings(params),
    placeholderData: keepPreviousData,
  });

  const setStatus = useMutation({
    mutationFn: (vars: { id: number; status: "CANCELLED" | "COMPLETED" }) =>
      crmApi.updateBookingStatus(vars.id, vars.status),
    onSuccess: () => {
      setNotice("");
      qc.invalidateQueries({ queryKey: ["crm", "bookings"] });
    },
    onError: (e) => setNotice(e instanceof ApiError ? e.message : "Update failed"),
  });

  const canUpdate = hasPermission("bookings.update");
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const isOpen = (s: string) => !["COMPLETED", "CANCELLED"].includes(s);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Bookings" subtitle={`${data?.total ?? "…"} bookings`} />
      {error instanceof ApiError && <Notice kind="error">{error.message}</Notice>}
      {notice && <Notice kind="error">{notice}</Notice>}

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          tabs={TABS}
          active={tab}
          onChange={(k) => {
            setTab(k);
            setPage(1);
          }}
        />
        <div className="relative ml-auto w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${inputCls} pl-10`}
            placeholder="Search customer, city…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Card>
        <TableShell head={["Booking", "Customer", "Service", "Amount", "Status", "Actions"]}>
          {isLoading && <EmptyRow cols={6} label="Loading…" />}
          {!isLoading && !data?.bookings.length && <EmptyRow cols={6} label="No bookings found" />}
          {data?.bookings.map((b) => (
            <tr key={b.bookingId} className="transition-colors hover:bg-accent/50">
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">#{b.bookingId}</div>
                <div className="text-xs text-muted-foreground">
                  {fmtDate(b.bookingDate)} · {b.startTime}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="text-foreground">{b.user?.name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {b.user?.mobile ?? ""} · {b.serviceCity}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {b.service?.name ?? "—"}
                {b.variant ? ` · ${b.variant.name}` : ""}
                <div className="text-xs">
                  {b.professional?.user?.name ? `Partner: ${b.professional.user.name}` : "Unassigned"}
                </div>
              </td>
              <td className="px-4 py-3 text-foreground">
                ₹{b.totalAmount}
                <div className="text-xs text-muted-foreground">{b.paymentMode}</div>
              </td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(b.status)}>{b.status.replaceAll("_", " ")}</Badge>
              </td>
              <td className="px-4 py-3">
                {canUpdate && isOpen(b.status) && (
                  <div className="flex gap-2">
                    <Btn
                      small
                      tone="success"
                      busy={setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: b.bookingId, status: "COMPLETED" })}
                    >
                      Complete
                    </Btn>
                    <Btn
                      small
                      tone="danger"
                      busy={setStatus.isPending}
                      onClick={() => setStatus.mutate({ id: b.bookingId, status: "CANCELLED" })}
                    >
                      Cancel
                    </Btn>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </TableShell>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Btn tone="ghost" small disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Btn>
            <Btn tone="ghost" small disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
