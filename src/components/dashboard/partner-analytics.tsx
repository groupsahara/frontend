"use client";

/**
 * Partner analytics — the "Analytics" tab of the Service Partners page.
 *
 * Everything renders from GET /v1/admin/partner-mis (the same endpoint and
 * query-cache shape as the Partner MIS Report page), scoped by the range
 * pills and the category filter at the top. This tab is the quick read —
 * top earners, where the money concentrates, who is available — while the
 * MIS page stays the exhaustive, exportable report.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { dashboardApi, type PartnerMisParams, type PartnerMisResponse } from "@/src/api/api";
import { BarList, ChartCard, KpiTile, inr, num } from "@/src/components/dashboard/analytics-charts";
import { SpinnerIcon, StarIcon } from "@/src/components/icons";

type RangeKey = "7d" | "30d" | "90d" | "12m";

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
  { key: "12m", label: "Last 12 months", days: 365 },
];

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/* ------------------------------ simple tile ------------------------------- */

/** KpiTile without a delta — for counts the API reports without a prior period. */
function SimpleTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-lg hover:shadow-black/5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      {sub ? <p className="mt-2 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

/* --------------------------- availability split --------------------------- */

/** Available / busy / unavailable — states, so they wear status colors, with
 *  the counts always visible in the legend (never color alone). */
function AvailabilityCard({ data }: { data: PartnerMisResponse }) {
  const a = data.charts.availability;
  const rows = [
    { label: "Available", value: a.available, color: "var(--success)" },
    { label: "Busy", value: a.busy, color: "var(--warning)" },
    { label: "Unavailable", value: a.unavailable, color: "var(--muted-foreground)" },
  ];
  const total = rows.reduce((s, r) => s + r.value, 0);
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
  return (
    <ChartCard title="Availability today" subtitle={`${num(total)} partners in this view`}>
      {total === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No partners in this filter.
        </div>
      ) : (
        <div className="space-y-4">
          {/* single stacked 100% bar, 2px surface gaps between segments */}
          <div className="flex h-4 w-full gap-0.5" role="img" aria-label="Partner availability split">
            {rows
              .filter((r) => r.value > 0)
              .map((r, i, arr) => (
                <div
                  key={r.label}
                  className="h-full"
                  style={{
                    width: `${(r.value / total) * 100}%`,
                    background: r.color,
                    borderRadius:
                      arr.length === 1
                        ? "4px"
                        : i === 0
                          ? "4px 0 0 4px"
                          : i === arr.length - 1
                            ? "0 4px 4px 0"
                            : "0",
                  }}
                />
              ))}
          </div>
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.label} className="flex items-center gap-2.5 text-sm">
                <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: r.color }} />
                <span className="text-foreground">{r.label}</span>
                <span className="ml-auto text-right">
                  <span className="font-medium text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {num(r.value)}
                  </span>
                  <span className="ml-2 inline-block w-9 text-xs text-muted-foreground">{pct(r.value)}%</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}

/* ---------------------------- top partners table --------------------------- */

function TopPartnersTable({ data }: { data: PartnerMisResponse }) {
  const rows = useMemo(
    () => [...data.partners].sort((a, b) => b.earnings - a.earnings).slice(0, 10),
    [data.partners],
  );
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-base font-semibold text-foreground">Top partners</h3>
        <p className="text-sm text-muted-foreground">Ranked by earnings in this period</p>
      </div>
      {rows.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No partners in this filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Partner</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 text-right font-medium">Completed</th>
                <th className="px-5 py-3 text-right font-medium">Acceptance</th>
                <th className="px-5 py-3 text-right font-medium">Completion</th>
                <th className="px-5 py-3 text-right font-medium">Rating</th>
                <th className="px-5 py-3 text-right font-medium">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={p.professionalId} className="border-t border-border transition-colors hover:bg-muted/40">
                  <td className="px-5 py-3">
                    <span className="mr-2.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                      {i + 1}
                    </span>
                    <Link
                      href={`/dashboard/dispatcher/partners/${p.professionalId}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {p.name ?? p.partnerId}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{p.category ?? "—"}</td>
                  <td className="px-5 py-3 text-right text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {num(p.completed)}
                  </td>
                  <td className="px-5 py-3 text-right text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {p.acceptanceRate}%
                  </td>
                  <td className="px-5 py-3 text-right text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {p.completionRate}%
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <StarIcon className="h-3.5 w-3.5 text-warning" />
                      {p.rating.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {inr(p.earnings)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- report --------------------------------- */

export function PartnerAnalytics() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [categoryId, setCategoryId] = useState("");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["partner-analytics", range, categoryId],
    // Dates are computed at fetch time (render must stay pure — no Date.now()
    // in the component body).
    queryFn: () => {
      const days = RANGES.find((r) => r.key === range)?.days ?? 30;
      const params: PartnerMisParams = {
        from: isoDay(new Date(Date.now() - days * 86_400_000)),
        to: isoDay(new Date()),
        categoryId: categoryId ? Number(categoryId) : undefined,
      };
      return dashboardApi.partnerMis(params);
    },
    placeholderData: keepPreviousData,
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <SpinnerIcon className="h-7 w-7" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-muted-foreground">Couldn’t load partner analytics.</p>
        <button
          onClick={() => refetch()}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  const k = data.kpis;
  const topEarners = [...data.partners].sort((a, b) => b.earnings - a.earnings).slice(0, 10);
  const byCategory = [...data.partners]
    .reduce<{ label: string; value: number }[]>((acc, p) => {
      const label = p.category ?? "Uncategorised";
      const hit = acc.find((c) => c.label === label);
      if (hit) hit.value += p.earnings;
      else acc.push({ label, value: p.earnings });
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* Filter row — scopes everything below it. Category is served by the
          endpoint itself, so the list always matches the data. */}
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            aria-pressed={range === r.key}
            className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              range === r.key
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30 dark:bg-blue-600"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="Filter by category"
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="">All categories</option>
          {data.filters.categories.map((c) => (
            <option key={c.categoryId} value={c.categoryId}>
              {c.name}
            </option>
          ))}
        </select>
        {isFetching && (
          <span className="ml-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <SpinnerIcon className="h-3.5 w-3.5" /> updating…
          </span>
        )}
        <Link
          href="/dashboard/dispatcher/partner-mis"
          className="ml-auto text-sm font-medium text-primary hover:underline"
        >
          Full MIS report →
        </Link>
      </div>

      {/* Holds the previous render (dimmed) while refetching — no flash. */}
      <div className={`space-y-6 transition-opacity ${isFetching ? "opacity-75" : ""}`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SimpleTile label="Total partners" value={num(k.totalPartners)} sub="in this filter" />
          <SimpleTile
            label="Active partners"
            value={num(k.activePartners)}
            sub={`${k.activePct}% of total · ${num(k.availableToday)} available today`}
          />
          <KpiTile label="Total earnings" value={inr(k.totalEarnings)} delta={k.earningsDeltaPct ?? 0} />
          <KpiTile label="Completion rate" value={`${k.completionRate}%`} delta={k.completionDelta} deltaSuffix="pp" />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard title="Top-earning partners" subtitle="Earnings in this period · completed jobs and rating alongside">
              <BarList
                rows={topEarners.map((p) => ({
                  id: p.professionalId,
                  label: p.name ?? p.partnerId,
                  value: p.earnings,
                  display: inr(p.earnings),
                  secondary: `${num(p.completed)} job${p.completed === 1 ? "" : "s"} · ★ ${p.rating.toFixed(1)}`,
                }))}
              />
            </ChartCard>
          </div>
          <AvailabilityCard data={data} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="Earnings by category" subtitle="Partner earnings, grouped by service category">
            <BarList
              rows={byCategory.map((c) => ({
                label: c.label,
                value: c.value,
                display: inr(c.value),
              }))}
            />
          </ChartCard>
          <div className="lg:col-span-2">
            <TopPartnersTable data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
