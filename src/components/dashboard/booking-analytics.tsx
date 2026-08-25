"use client";

/**
 * Booking analytics — the "Analytics" tab of the Bookings view.
 *
 * Everything renders from GET /v1/admin/analytics (same endpoint and query
 * cache as the Analytics page), scoped by the range pills at the top.
 *
 * The status donut's slice ORDER is a colorblind-safety mechanism, exactly
 * like the --chart-* palette: blue → amber → cyan → red (and red wraps back
 * to blue) was validated for CVD separation in both themes. Green is
 * deliberately absent — any ring holding both red and green has a
 * red↔green edge that collapses under deuteranopia. Never reorder or
 * recolor the slices without re-validating.
 */

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  dashboardApi,
  queryKeys,
  type AnalyticsRange,
  type AnalyticsResponse,
} from "@/src/api/api";
import {
  BarList,
  BookingsTrendCard,
  ChartCard,
  KpiTile,
  inr,
  num,
} from "@/src/components/dashboard/analytics-charts";
import { SpinnerIcon } from "@/src/components/icons";

const RANGES: { key: AnalyticsRange; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "12m", label: "Last 12 months" },
];

/* ------------------------------ status donut ----------------------------- */

/** Statuses folded into four outcomes so the ring stays CVD-legible. */
const OUTCOMES = [
  { key: "COMPLETED", label: "Completed", color: "var(--chart-1)" },
  // #d97706 (not var(--warning)): the dark theme's warning #f59e0b sits
  // outside the dark-surface lightness band; this step passes in both modes.
  { key: "PENDING", label: "Pending", color: "#d97706" },
  { key: "ACTIVE", label: "Active", color: "var(--chart-2)" },
  { key: "CANCELLED", label: "Cancelled", color: "var(--danger)" },
] as const;

type OutcomeKey = (typeof OUTCOMES)[number]["key"];

const ACTIVE_STATUSES = new Set(["ASSIGNED", "ACCEPTED", "ON_THE_WAY", "IN_PROGRESS"]);

function outcomeCounts(data: AnalyticsResponse): Record<OutcomeKey, number> {
  const counts: Record<OutcomeKey, number> = {
    COMPLETED: 0,
    PENDING: 0,
    ACTIVE: 0,
    CANCELLED: 0,
  };
  for (const s of data.statusBreakdown) {
    if (s.status === "COMPLETED") counts.COMPLETED += s.count;
    else if (s.status === "CANCELLED") counts.CANCELLED += s.count;
    else if (s.status === "PENDING") counts.PENDING += s.count;
    else if (ACTIVE_STATUSES.has(s.status)) counts.ACTIVE += s.count;
    else counts.ACTIVE += s.count; // future statuses read as in-flight
  }
  return counts;
}

const C = 100; // center
const R_OUT = 84;
const R_IN = 58;
const R_MID = (R_OUT + R_IN) / 2;
/** Half of a 2px surface gap, as an angle at the ring's mid-radius. */
const PAD = 1 / R_MID;

function polar(r: number, a: number): [number, number] {
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

/** Ring segment from a0 to a1 (radians, a1 > a0). */
function slicePath(a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = polar(R_OUT, a0);
  const [x1, y1] = polar(R_OUT, a1);
  const [x2, y2] = polar(R_IN, a1);
  const [x3, y3] = polar(R_IN, a0);
  return [
    `M${x0.toFixed(2)} ${y0.toFixed(2)}`,
    `A${R_OUT} ${R_OUT} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `L${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `A${R_IN} ${R_IN} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function StatusDonutCard({ data }: { data: AnalyticsResponse }) {
  const [active, setActive] = useState<OutcomeKey | null>(null);

  const counts = useMemo(() => outcomeCounts(data), [data]);
  const total = OUTCOMES.reduce((s, o) => s + counts[o.key], 0);
  const visible = OUTCOMES.filter((o) => counts[o.key] > 0);

  const slices = useMemo(() => {
    // Cumulative start angle per slice, from 12 o'clock.
    const spans = visible.map((o) => (counts[o.key] / total) * 2 * Math.PI);
    return visible.map((o, i) => {
      const a0 = -Math.PI / 2 + spans.slice(0, i).reduce((s, a) => s + a, 0);
      // A hairline slice keeps its ink: shrink the gap before the slice.
      const pad = Math.min(PAD, spans[i] / 4);
      return { ...o, count: counts[o.key], d: slicePath(a0 + pad, a0 + spans[i] - pad) };
    });
  }, [visible, counts, total]);

  const focus = active ? slices.find((s) => s.key === active) : null;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <ChartCard title="Status split" subtitle="Every booking in this period, by outcome">
      {total === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No bookings in this period.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="relative mx-auto max-w-56">
            <svg
              viewBox="0 0 200 200"
              className="w-full"
              role="img"
              aria-label={`Booking status split: ${slices
                .map((s) => `${s.label} ${num(s.count)} (${pct(s.count)}%)`)
                .join(", ")}`}
              onPointerLeave={() => setActive(null)}
            >
              {visible.length === 1 ? (
                <circle
                  cx={C}
                  cy={C}
                  r={R_MID}
                  fill="none"
                  stroke={visible[0].color}
                  strokeWidth={R_OUT - R_IN}
                />
              ) : (
                slices.map((s) => (
                  <path
                    key={s.key}
                    d={s.d}
                    fill={s.color}
                    tabIndex={0}
                    aria-label={`${s.label}: ${num(s.count)} booking${s.count === 1 ? "" : "s"} (${pct(s.count)}%)`}
                    onPointerEnter={() => setActive(s.key)}
                    onFocus={() => setActive(s.key)}
                    onBlur={() => setActive(null)}
                    className="cursor-pointer outline-none transition-opacity motion-reduce:transition-none focus-visible:stroke-ring focus-visible:stroke-2"
                    style={{
                      opacity: active === null || active === s.key ? 1 : 0.35,
                    }}
                  />
                ))
              )}
            </svg>
            {/* Center readout — the hovered/focused slice takes it over. */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-semibold tracking-tight text-foreground">
                {num(focus ? focus.count : total)}
              </span>
              <span className="max-w-24 truncate text-xs text-muted-foreground">
                {focus ? `${focus.label.toLowerCase()} · ${pct(focus.count)}%` : "bookings"}
              </span>
            </div>
          </div>

          <ul className="space-y-2.5">
            {OUTCOMES.map((o) => (
              <li
                key={o.key}
                className="flex items-center gap-2.5 text-sm"
                onPointerEnter={() => counts[o.key] > 0 && setActive(o.key)}
                onPointerLeave={() => setActive(null)}
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                  style={{ background: o.color }}
                />
                <span className="text-foreground">{o.label}</span>
                <span className="ml-auto text-right">
                  <span
                    className="font-medium text-foreground"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {num(counts[o.key])}
                  </span>
                  <span className="ml-2 inline-block w-9 text-xs text-muted-foreground">
                    {pct(counts[o.key])}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}

/* ---------------------------- simple stat tile ---------------------------- */

/** KpiTile without the delta pill — the API has no per-status deltas. */
function StatTile({
  label,
  value,
  spark,
  sparkColor,
}: {
  label: string;
  value: string;
  spark?: number[];
  sparkColor?: string;
}) {
  const sparkline = useMemo(() => {
    if (!spark || spark.length < 2) return null;
    const min = Math.min(...spark);
    const max = Math.max(...spark);
    const span = max - min || 1;
    return spark
      .map((v, i) => `${(i / (spark.length - 1)) * 120},${36 - ((v - min) / span) * 32}`)
      .join(" ");
  }, [spark]);
  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-lg hover:shadow-black/5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">in this period</p>
      {sparkline ? (
        <svg viewBox="0 0 120 40" className="mt-3 h-10 w-full" preserveAspectRatio="none" aria-hidden>
          <polyline
            points={sparkline}
            fill="none"
            stroke={sparkColor ?? "var(--chart-1)"}
            strokeOpacity="0.55"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : null}
    </div>
  );
}

/* ------------------------------ services table ---------------------------- */

function ServicesTable({ data }: { data: AnalyticsResponse }) {
  const rows = useMemo(
    () => [...data.topServices].sort((a, b) => b.bookings - a.bookings),
    [data.topServices],
  );
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-base font-semibold text-foreground">Service performance</h3>
        <p className="text-sm text-muted-foreground">
          Top services, ranked by bookings · revenue from completed bookings
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No bookings in this period.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">Service</th>
                <th className="px-5 py-3 text-right font-medium">Bookings</th>
                <th className="px-5 py-3 text-right font-medium">Revenue</th>
                <th className="px-5 py-3 text-right font-medium">Avg value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <tr key={s.serviceId} className="border-t border-border transition-colors hover:bg-muted/40">
                  <td className="px-5 py-3">
                    <span className="mr-2.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                      {i + 1}
                    </span>
                    <span className="font-medium text-foreground">{s.name}</span>
                  </td>
                  <td className="px-5 py-3 text-right text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {num(s.bookings)}
                  </td>
                  <td className="px-5 py-3 text-right text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {inr(s.revenue)}
                  </td>
                  <td className="px-5 py-3 text-right text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {s.bookings > 0 ? inr(Math.round(s.revenue / s.bookings)) : "—"}
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

/* --------------------------------- report -------------------------------- */

export function BookingAnalytics() {
  const [range, setRange] = useState<AnalyticsRange>("30d");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.analytics(range),
    queryFn: () => dashboardApi.getAnalytics(range),
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
        <p className="text-muted-foreground">Couldn’t load booking analytics.</p>
        <button
          onClick={() => refetch()}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  const counts = outcomeCounts(data);
  const mostBooked = [...data.topServices].sort((a, b) => b.bookings - a.bookings);

  return (
    <div className="space-y-6">
      {/* Range filter row — scopes everything below it. */}
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            aria-pressed={range === r.key}
            className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              range === r.key
                ? // dark:bg-blue-600 — the dark --primary is only ~3.7:1 under
                  // white text; blue-600 keeps the selected label AA-readable.
                  "bg-primary text-primary-foreground shadow-sm shadow-primary/30 dark:bg-blue-600"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
        {isFetching && (
          <span className="ml-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <SpinnerIcon className="h-3.5 w-3.5" /> updating…
          </span>
        )}
      </div>

      {/* Holds the previous render (dimmed) while refetching — no flash. */}
      <div className={`space-y-6 transition-opacity ${isFetching ? "opacity-75" : ""}`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            label="Total bookings"
            value={num(data.kpis.bookings.value)}
            delta={data.kpis.bookings.delta}
            spark={data.series.map((p) => p.bookings)}
          />
          <StatTile
            label="Completed"
            value={num(counts.COMPLETED)}
            spark={data.series.map((p) => p.completed)}
          />
          <StatTile
            label="Cancelled"
            value={num(counts.CANCELLED)}
            spark={data.series.map((p) => p.cancelled)}
            sparkColor="var(--danger)"
          />
          <KpiTile
            label="Completion rate"
            value={`${data.kpis.completionRate.value}%`}
            delta={data.kpis.completionRate.delta}
            deltaSuffix="pp"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <StatusDonutCard data={data} />
          <div className="lg:col-span-2">
            <BookingsTrendCard series={data.series} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="Most-booked services" subtitle="Ranked by bookings in this period">
            <BarList
              rows={mostBooked.map((s) => ({
                id: s.serviceId,
                label: s.name,
                value: s.bookings,
                display: num(s.bookings),
                secondary: `${inr(s.revenue)} revenue`,
              }))}
            />
          </ChartCard>
          <div className="lg:col-span-2">
            <ServicesTable data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
