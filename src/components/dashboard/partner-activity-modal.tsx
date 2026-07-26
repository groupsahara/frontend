"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { dispatcherApi, type PartnerActivity } from "@/src/api/api";
import { SpinnerIcon } from "@/src/components/icons";

/** "8130" → "2h 15m 30s" (seconds dropped once it's an hour or more). */
function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** Precise H : M : S for the headline total. */
function fmtHms(totalSeconds: number): { h: number; m: number; s: number } {
  const s = Math.max(0, Math.floor(totalSeconds));
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

function fmtClock(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtDay(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

/** "2026-07-24" → "Fri 24 Jul". */
function fmtDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
}

const PERIODS: { key: "week" | "month"; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
];

export function PartnerActivityModal({
  professionalId,
  partnerName,
  onClose,
}: {
  professionalId: number;
  partnerName: string | null;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<"week" | "month">("week");

  const { data, isLoading, isError, refetch } = useQuery<PartnerActivity>({
    queryKey: ["partner-activity", professionalId, period],
    queryFn: () => dispatcherApi.getPartnerActivity(professionalId, period),
    placeholderData: keepPreviousData,
  });

  const total = fmtHms(data?.totalActiveSeconds ?? 0);
  const maxDay = Math.max(1, ...(data?.breakdown ?? []).map((d) => d.activeSeconds));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <span className="truncate">{partnerName || `Partner #${professionalId}`}</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  data?.isOnline
                    ? "bg-success/10 text-success"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    data?.isOnline ? "bg-success" : "bg-muted-foreground/50"
                  }`}
                />
                {data?.isOnline ? "Online now" : "Offline"}
              </span>
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Active hours &amp; login session logs{data?.mobile ? ` · ${data.mobile}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Period tabs */}
        <div className="flex gap-1 border-b border-border px-5 pt-3">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                period === p.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <SpinnerIcon className="h-6 w-6" />
            </div>
          ) : isError ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
              <p className="text-muted-foreground">Couldn’t load activity.</p>
              <button
                onClick={() => refetch()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Total active time</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                    {total.h}
                    <span className="text-base font-semibold text-muted-foreground">h </span>
                    {total.m}
                    <span className="text-base font-semibold text-muted-foreground">m </span>
                    {total.s}
                    <span className="text-base font-semibold text-muted-foreground">s</span>
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">Login sessions</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                    {data?.sessionCount ?? 0}
                  </p>
                </div>
                <div className="col-span-2 rounded-xl border border-border bg-background p-4 sm:col-span-1">
                  <p className="text-xs text-muted-foreground">Period</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {fmtDay(data?.range.from ?? null)} – {fmtDay(data?.range.to ?? null)}
                  </p>
                </div>
              </div>

              {/* Daily breakdown — the weekly/monthly report */}
              <div className="mt-6">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active hours per day
                </h4>
                <div className="space-y-1.5">
                  {(data?.breakdown ?? []).map((d) => (
                    <div key={d.date} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs text-muted-foreground">
                        {fmtDayLabel(d.date)}
                      </span>
                      <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
                        <div
                          className="h-full rounded bg-primary/80"
                          style={{ width: `${(d.activeSeconds / maxDay) * 100}%` }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right text-xs font-medium text-foreground">
                        {d.activeSeconds > 0 ? fmtDuration(d.activeSeconds) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session logs — what time to what time */}
              <div className="mt-6">
                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Login sessions ({data?.sessions.length ?? 0})
                </h4>
                {data && data.sessions.length > 0 ? (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                          <th className="px-4 py-2.5 font-medium">Date</th>
                          <th className="px-4 py-2.5 font-medium">Online</th>
                          <th className="px-4 py-2.5 font-medium">Offline</th>
                          <th className="px-4 py-2.5 text-right font-medium">Duration</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.sessions.map((s) => (
                          <tr key={s.logId} className="border-t border-border">
                            <td className="px-4 py-2.5 text-muted-foreground">{fmtDay(s.onlineAt)}</td>
                            <td className="px-4 py-2.5 text-foreground">{fmtClock(s.onlineAt)}</td>
                            <td className="px-4 py-2.5">
                              {s.ongoing ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                                  Ongoing
                                </span>
                              ) : (
                                <span className="text-foreground">{fmtClock(s.offlineAt)}</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium text-foreground">
                              {fmtDuration(s.durationSeconds)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                    No logins in this period.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
