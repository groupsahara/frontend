"use client";

import { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dispatcherApi, queryKeys, type PartnerRow } from "@/src/api/api";
import { ApiError } from "@/src/api/apiClient";
import { ConfirmDialog } from "@/src/components/dashboard/confirm-dialog";
import {
  PencilIcon,
  SearchIcon,
  SpinnerIcon,
  StarIcon,
  TrashIcon,
  UsersIcon,
} from "@/src/components/icons";

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function ServicePartnersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PartnerRow | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.partners(search.trim()),
    queryFn: () => dispatcherApi.listPartners(search.trim() || undefined),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["dispatcher", "partners"] });

  const blockMutation = useMutation({
    mutationFn: ({ id, isBlocked }: { id: number; isBlocked: boolean }) =>
      dispatcherApi.setPartnerBlocked(id, isBlocked),
    onSuccess: (res) => {
      setNotice(res.message);
      invalidate();
    },
    onError: (e) => setNotice(e instanceof ApiError ? e.message : "Action failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => dispatcherApi.deletePartner(id),
    onSuccess: (res) => {
      setNotice(res.message);
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e) => {
      setDeleteTarget(null);
      setNotice(e instanceof ApiError ? e.message : "Could not delete partner.");
    },
  });

  const busy = blockMutation.isPending;
  const partners = data ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Service Partners</h1>
        <p className="text-sm text-muted-foreground">
          Service professionals onboarded on the platform.
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, mobile or city"
            className="w-full rounded-xl border border-border bg-card py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>
        {!isLoading && (
          <span className="shrink-0 text-sm text-muted-foreground">
            {partners.length} partner{partners.length === 1 ? "" : "s"}
            {isFetching ? " · updating…" : ""}
          </span>
        )}
      </div>

      {notice ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-accent px-4 py-2.5 text-sm text-foreground">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="flex h-60 items-center justify-center text-muted-foreground">
            <SpinnerIcon className="h-6 w-6" />
          </div>
        ) : isError ? (
          <div className="flex h-60 flex-col items-center justify-center gap-3 text-center">
            <p className="text-muted-foreground">Couldn’t load service partners.</p>
            <button
              onClick={() => refetch()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Retry
            </button>
          </div>
        ) : partners.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center gap-3 text-center">
            <UsersIcon className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {search ? "No partners match your search." : "No service partners yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Partner</th>
                  <th className="px-5 py-3 font-medium">Mobile</th>
                  <th className="px-5 py-3 font-medium">Service</th>
                  <th className="px-5 py-3 font-medium">City</th>
                  <th className="px-5 py-3 font-medium">Rating</th>
                  <th className="px-5 py-3 font-medium">Wallet</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p: PartnerRow) => (
                  <tr
                    key={p.professionalId}
                    className="border-t border-border transition-colors hover:bg-muted/40"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/dispatcher/partners/${p.professionalId}`}
                        className="group flex items-center gap-3"
                      >
                        <PartnerAvatar partner={p} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground group-hover:text-primary group-hover:underline">
                            {p.name}
                          </p>
                          {p.email && (
                            <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{p.mobile ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {p.service ?? p.category ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{p.city ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <StarIcon className="h-3.5 w-3.5 text-warning" />
                        {p.rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground">{inr(p.walletBalance)}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {p.isBlocked ? (
                          <span className="inline-flex rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
                            Blocked
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                              p.isOnline
                                ? "bg-success/10 text-success"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                p.isOnline ? "bg-success" : "bg-muted-foreground"
                              }`}
                            />
                            {p.isOnline ? "Online" : "Offline"}
                          </span>
                        )}
                        {p.isVerified && (
                          <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            Verified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/dashboard/dispatcher/partners/${p.professionalId}`}
                          aria-label="Edit partner"
                          title="Edit"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-primary"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        <span className="mx-1 flex items-center gap-1.5">
                          <button
                            role="switch"
                            aria-checked={p.isBlocked}
                            onClick={() =>
                              blockMutation.mutate({ id: p.professionalId, isBlocked: !p.isBlocked })
                            }
                            disabled={busy}
                            aria-label={p.isBlocked ? "Unblock partner" : "Block partner"}
                            title={p.isBlocked ? "Unblock partner" : "Block partner"}
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                              p.isBlocked ? "bg-danger" : "bg-muted"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                                p.isBlocked ? "translate-x-4" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                          <span
                            className={`text-xs font-medium ${
                              p.isBlocked ? "text-danger" : "text-muted-foreground"
                            }`}
                          >
                            {p.isBlocked ? "Blocked" : "Block"}
                          </span>
                        </span>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          aria-label="Delete partner"
                          title="Delete"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-danger/10 hover:text-danger"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          danger
          title="Permanently delete this partner?"
          confirmLabel="Delete everything"
          busy={deleteMutation.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteMutation.mutate(deleteTarget.professionalId)}
          message={
            <>
              This will permanently delete{" "}
              <strong className="text-foreground">{deleteTarget.name}</strong> and erase{" "}
              <strong className="text-foreground">all associated data</strong> — profile, bookings,
              wallet &amp; transactions, ratings, availability and subscriptions. This action is
              irreversible.
            </>
          }
        />
      )}
    </div>
  );
}

function PartnerAvatar({ partner }: { partner: PartnerRow }) {
  if (partner.profileImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external partner image
      <img
        src={partner.profileImage}
        alt={partner.name}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }
  const initials = partner.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-semibold text-white">
      {initials || "?"}
    </div>
  );
}
