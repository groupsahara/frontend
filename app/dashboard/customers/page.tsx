"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { customersApi, queryKeys, type CustomerRow } from "@/src/api/api";
import { SearchIcon, SpinnerIcon, UsersIcon } from "@/src/components/icons";

export default function CustomersPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.customers(search.trim()),
    queryFn: () => customersApi.list(search.trim() || undefined),
    placeholderData: keepPreviousData,
  });

  const customers = data ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Everyone who has signed up on the platform.
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, mobile, email or restaurant"
            className="w-full rounded-xl border border-border bg-card py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>
        {!isLoading && (
          <span className="shrink-0 text-sm text-muted-foreground">
            {customers.length} customer{customers.length === 1 ? "" : "s"}
            {isFetching ? " · updating…" : ""}
          </span>
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
            <p className="text-muted-foreground">Couldn’t load customers.</p>
            <button
              onClick={() => refetch()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Retry
            </button>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center gap-3 text-center">
            <UsersIcon className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {search ? "No customers match your search." : "No customers yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Mobile</th>
                  <th className="px-5 py-3 font-medium">Restaurant</th>
                  <th className="px-5 py-3 font-medium">Bookings</th>
                  <th className="px-5 py-3 font-medium">Addresses</th>
                  <th className="px-5 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c: CustomerRow) => (
                  <tr
                    key={c.userId}
                    className="border-t border-border transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/customers/${c.userId}`}
                        className="group flex items-center gap-3"
                      >
                        <CustomerAvatar customer={c} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground group-hover:text-primary group-hover:underline">
                            {c.name}
                          </p>
                          {c.email && (
                            <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{c.mobile ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.restaurantName ?? "—"}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{c.bookingsCount}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.addressCount}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {new Date(c.joinedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomerAvatar({ customer }: { customer: CustomerRow }) {
  if (customer.profileImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external customer image
      <img
        src={customer.profileImage}
        alt={customer.name}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }
  const initials = customer.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-semibold text-white">
      {initials || "?"}
    </div>
  );
}
