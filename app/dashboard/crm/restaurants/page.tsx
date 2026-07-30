"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ApiError } from "@/src/api/apiClient";
import { crmQueryKeys, crmRestaurantsApi } from "@/src/api/api";
import {
  Btn,
  Card,
  EmptyRow,
  inputCls,
  Notice,
  PageHeader,
  TableShell,
  fmtDate,
} from "@/src/components/crm/ui";
import { SearchIcon } from "@/src/components/icons";

const PAGE_SIZE = 20;

/**
 * Restaurants as our customers identified them. The only restaurant details we
 * actually capture are the ones the customer enters at their first booking —
 * restaurant name, owner name and GST — stored on their User row. This list is
 * therefore read-only; the customer owns the data.
 */
export default function CrmRestaurantsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const params = { search: search || undefined, page, limit: PAGE_SIZE };

  const { data, isLoading, error } = useQuery({
    queryKey: crmQueryKeys.restaurants(params),
    queryFn: () => crmRestaurantsApi.fromCustomers(params),
    placeholderData: keepPreviousData,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Restaurants"
        subtitle={
          data ? `${data.total} restaurant${data.total === 1 ? "" : "s"}` : "…"
        }
      />
      {error instanceof ApiError && <Notice kind="error">{error.message}</Notice>}

      <p className="text-sm text-muted-foreground">
        Details entered by the customer when they place their first booking.
      </p>

      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className={`${inputCls} pl-10`}
          placeholder="Search restaurant, owner, GST or mobile…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card>
        <TableShell
          head={["Restaurant", "Owner", "GST number", "Mobile", "Bookings", "Customer since"]}
        >
          {isLoading && <EmptyRow cols={6} label="Loading…" />}
          {!isLoading && !data?.restaurants.length && (
            <EmptyRow
              cols={6}
              label={
                search
                  ? "No restaurants match your search"
                  : "No customer has entered restaurant details yet"
              }
            />
          )}
          {data?.restaurants.map((r) => (
            <tr key={r.userId} className="transition-colors hover:bg-accent/50">
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{r.restaurantName ?? "—"}</span>
                  {r.isAlsoPartner && (
                    <span
                      title="This login also works as a service partner"
                      className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-sky-600"
                    >
                      Also partner
                    </span>
                  )}
                </div>
                {r.email && <div className="text-xs text-muted-foreground">{r.email}</div>}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{r.ownerName ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.gstNumber ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.mobile ?? "—"}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/customers/${r.userId}`}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {r.bookingsCount}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{fmtDate(r.joinedAt)}</td>
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
            <Btn
              tone="ghost"
              small
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
