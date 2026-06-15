"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { customersApi, queryKeys, type CustomerDetail } from "@/src/api/api";
import { SpinnerIcon } from "@/src/components/icons";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

const statusStyles: Record<string, string> = {
  Completed: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  Cancelled: "bg-danger/10 text-danger",
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = Number(params?.id);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.customer(userId),
    queryFn: () => customersApi.get(userId),
    enabled: Number.isFinite(userId),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/dashboard/customers"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Back to Customers
      </Link>

      {isLoading ? (
        <div className="flex h-60 items-center justify-center text-muted-foreground">
          <SpinnerIcon className="h-6 w-6" />
        </div>
      ) : isError || !data ? (
        <div className="flex h-60 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card text-center">
          <p className="text-muted-foreground">Couldn’t load this customer.</p>
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Retry
          </button>
        </div>
      ) : (
        <CustomerView customer={data} />
      )}
    </div>
  );
}

function CustomerView({ customer }: { customer: CustomerDetail }) {
  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-5">
        <Avatar customer={customer} />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{customer.name}</h1>
          <p className="text-sm text-muted-foreground">
            {customer.restaurantName ? `${customer.restaurantName} · ` : ""}Joined{" "}
            {new Date(customer.joinedAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total bookings" value={String(customer.stats.totalBookings)} />
        <Stat label="Completed" value={String(customer.stats.completed)} />
        <Stat label="Cancelled" value={String(customer.stats.cancelled)} />
        <Stat label="Total spent" value={inr(customer.stats.totalSpent)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile */}
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Profile</h2>
          <Info label="Email" value={customer.email ?? "—"} />
          <Info label="Mobile" value={customer.mobile ?? "—"} />
          <Info
            label="Date of birth"
            value={
              customer.dob
                ? new Date(customer.dob).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "—"
            }
          />
          <Info label="Restaurant" value={customer.restaurantName ?? "—"} />
          <Info label="GST number" value={customer.gstNumber ?? "—"} />
        </div>

        {/* Addresses */}
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-foreground">
            Addresses{" "}
            <span className="font-normal text-muted-foreground">({customer.addresses.length})</span>
          </h2>
          {customer.addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved addresses.</p>
          ) : (
            <div className="space-y-3">
              {customer.addresses.map((a) => (
                <div key={a.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{a.label || "Address"}</span>
                    {a.isDefault && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.address}, {a.city}
                    {a.state ? `, ${a.state}` : ""} {a.zipCode}
                    {a.country ? `, ${a.country}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bookings */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">
            Recent bookings{" "}
            <span className="font-normal text-muted-foreground">
              (showing {customer.bookings.length})
            </span>
          </h2>
        </div>
        {customer.bookings.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No bookings yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Booking</th>
                  <th className="px-5 py-3 font-medium">Service</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Payment</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {customer.bookings.map((b) => (
                  <tr key={b.id} className="border-t border-border hover:bg-muted/40">
                    <td className="px-5 py-3 font-medium text-foreground">{b.id}</td>
                    <td className="px-5 py-3 text-foreground">
                      {b.service}
                      {b.variant ? (
                        <span className="block text-xs text-muted-foreground">{b.variant}</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">{inr(b.amount)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{b.paymentMode}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[b.status]}`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{b.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function Avatar({ customer }: { customer: CustomerDetail }) {
  if (customer.profileImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external customer image
      <img
        src={customer.profileImage}
        alt={customer.name}
        className="h-14 w-14 shrink-0 rounded-full object-cover"
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
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-base font-semibold text-white">
      {initials || "?"}
    </div>
  );
}
