"use client";

/**
 * Chart cards for the admin analytics page. Everything is hand-rolled SVG/divs
 * (no chart library), themed via the CSS chart tokens so light/dark both work.
 *
 * Design rules baked in (keep them when editing):
 * - one y-axis per chart, never two scales on one plot
 * - 2px lines, ~10% area washes, bars ≤ 24px thick with a 4px rounded data-end
 * - 2px surface gaps between stacked segments, solid hairline gridlines
 * - legend whenever a chart has ≥ 2 series; values also readable without hover
 *   (axis ticks, direct labels, or the table toggle) — tooltips only enhance
 * - SVGs render at their measured pixel width (ResizeObserver), so pointer →
 *   data-index math is 1:1 and text never scales/distorts
 */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type {
  AnalyticsPaymentMode,
  AnalyticsSeriesPoint,
} from "@/src/api/api";
import { TrendDown, TrendUp } from "@/src/components/icons";

/* ------------------------------ formatting ------------------------------ */

export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function num(n: number): string {
  return n.toLocaleString("en-IN");
}

/** Round an axis max up to a clean 1/2/2.5/5 × 10^k number. */
function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  const frac = value / base;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
  return nice * base;
}

/** Compact tick label: ₹1.2L / 45K style for big axes, plain otherwise. */
function tickLabel(n: number, money: boolean): string {
  const abs = Math.abs(n);
  const compact =
    abs >= 10000000
      ? `${(n / 10000000).toLocaleString("en-IN", { maximumFractionDigits: 1 })}Cr`
      : abs >= 100000
        ? `${(n / 100000).toLocaleString("en-IN", { maximumFractionDigits: 1 })}L`
        : abs >= 1000
          ? `${(n / 1000).toLocaleString("en-IN", { maximumFractionDigits: 1 })}K`
          : `${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  return money ? `₹${compact}` : compact;
}

/** Quarter-of-max ticks for continuous (money) axes. */
function fractionTicks(max: number): number[] {
  return [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);
}

/** Whole-number ticks for count axes — never labels "1.5 bookings". */
function integerTicks(max: number): number[] {
  const step = Math.max(1, Math.ceil(max / 4));
  const vals: number[] = [];
  for (let v = 0; v <= max; v += step) vals.push(v);
  if (vals[vals.length - 1] !== max) vals.push(max);
  return vals;
}

/** Pick ≤ maxCount evenly spaced x-label indices, always including first & last. */
function labelIndices(n: number, maxCount = 6): Set<number> {
  if (n <= maxCount) return new Set(Array.from({ length: n }, (_, i) => i));
  const step = Math.ceil((n - 1) / (maxCount - 1));
  const idx = new Set<number>();
  for (let i = 0; i < n; i += step) idx.add(i);
  idx.add(n - 1);
  // Drop a label that would crowd the final one.
  for (const i of [...idx]) {
    if (i !== n - 1 && n - 1 - i < step / 2) idx.delete(i);
  }
  return idx;
}

/** Width-aware x-label budget: one label per ~70px of plot, clamped 4–10. */
function maxXLabels(plotW: number): number {
  return Math.max(4, Math.min(10, Math.floor(plotW / 70)));
}

/** "Sun, 2 Aug 2026" for daily buckets; week/month buckets keep their label. */
function fullDateLabel(series: AnalyticsSeriesPoint[], i: number): string {
  const p = series[i];
  const next = series[i + 1] ?? series[i - 1];
  if (!next) return p.label;
  const step = Math.abs(new Date(next.date).getTime() - new Date(p.date).getTime());
  if (step !== 86_400_000) return p.label;
  return new Date(p.date).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Dashed neutral reference line for the period average, labelled at the right
 *  edge — dashed so it never impersonates the solid recessive gridlines. */
function AvgLine({ y, label, W }: { y: number; label: string; W: number }) {
  return (
    <g pointerEvents="none">
      <line
        x1={PAD_L}
        x2={W - PAD_R}
        y1={y}
        y2={y}
        stroke="var(--muted-foreground)"
        strokeOpacity="0.5"
        strokeWidth="1"
        strokeDasharray="4 3"
      />
      <text x={PAD_L + 4} y={y - 4} fontSize="9.5" fill="var(--muted-foreground)">
        {label}
      </text>
    </g>
  );
}

/** The hovered date, highlighted on the axis band under the crosshair. */
function HoverDatePill({ x, label, W }: { x: number; label: string; W: number }) {
  const w = label.length * 5.6 + 16;
  const left = Math.max(PAD_L, Math.min(W - PAD_R - w, x - w / 2));
  return (
    <g pointerEvents="none">
      <rect x={left} y={H - 20} width={w} height={16} rx={8} fill="var(--accent)" />
      <text
        x={left + w / 2}
        y={H - 8.5}
        textAnchor="middle"
        fontSize="10"
        fontWeight={600}
        fill="var(--accent-foreground)"
      >
        {label}
      </text>
    </g>
  );
}

/** Track the rendered width of a wrapper so the SVG can draw at 1:1 pixels. */
function useMeasuredWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/* ------------------------------- KPI tile ------------------------------- */

export function KpiTile({
  label,
  value,
  delta,
  deltaSuffix = "%",
  goodWhenDown = false,
  spark,
}: {
  label: string;
  value: string;
  /** Change vs the previous period; sign drives the arrow, 0 renders neutral. */
  delta: number;
  /** "%" for percent change, "pp" for percentage-point change. */
  deltaSuffix?: string;
  /** For rates where a falling number is the good direction (cancellations). */
  goodWhenDown?: boolean;
  spark?: number[];
}) {
  const zero = delta === 0;
  const up = delta > 0;
  const good = goodWhenDown ? delta < 0 : delta > 0;
  // Light-theme success/danger tokens sit under 4.5:1 on the tinted pill at
  // 12px, so the pill text uses darker AA-passing shades in light mode and the
  // regular tokens in dark mode (where they pass).
  const pillClass = zero
    ? "bg-muted text-muted-foreground"
    : good
      ? "bg-success/10 text-[#15803d] dark:text-success"
      : "bg-danger/10 text-[#b91c1c] dark:text-danger";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-lg hover:shadow-black/5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${pillClass}`}>
          {!zero &&
            (up ? (
              <TrendUp className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <TrendDown className="h-3.5 w-3.5" aria-hidden />
            ))}
          <span className="sr-only">{zero ? "unchanged" : up ? "up" : "down"}</span>
          {Math.abs(delta)}
          {deltaSuffix}
        </span>
        <span className="text-xs text-muted-foreground">vs previous period</span>
      </div>
      {spark && spark.length > 1 ? <KpiSparkline data={spark} /> : null}
    </div>
  );
}

function KpiSparkline({ data }: { data: number[] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 120},${36 - ((v - min) / span) * 32}`)
    .join(" ");
  return (
    <svg viewBox="0 0 120 40" className="mt-3 h-10 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke="var(--chart-1)"
        strokeOpacity="0.55"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* --------------------------- card scaffolding --------------------------- */

function ChartCard({
  title,
  subtitle,
  legend,
  toggle,
  children,
}: {
  title: string;
  subtitle?: string;
  legend?: React.ReactNode;
  toggle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          {legend}
          {toggle}
        </div>
      </div>
      {children}
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: "chart" | "table";
  onChange: (v: "chart" | "table") => void;
}) {
  return (
    <div className="flex rounded-lg border border-border p-0.5 text-xs font-medium">
      {(["chart", "table"] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={view === v}
          className={`rounded-md px-2.5 py-1 capitalize transition ${
            view === v ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span aria-hidden className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
    </span>
  );
}

function EmptyChart({ message = "No data in this period." }: { message?: string }) {
  return (
    <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">{message}</div>
  );
}

/* --------------------------- revenue trend card -------------------------- */

const H = 240;
const PAD_L = 46; // room for y tick labels
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 26; // x-axis label band

export function RevenueTrendCard({ series }: { series: AnalyticsSeriesPoint[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [hoverRaw, setHoverRaw] = useState<number | null>(null);
  const gradId = useId();
  const [wrapRef, measuredW] = useMeasuredWidth();
  const W = measuredW || 640;

  const n = series.length;
  // Clamp: hover can go stale when a range switch shrinks the series while the
  // chart stays mounted (keepPreviousData) — never index past the new end.
  const hover = hoverRaw == null ? null : Math.min(hoverRaw, n - 1);
  const hasData = n > 1 && series.some((p) => p.revenue > 0);

  const geom = useMemo(() => {
    if (n < 2) return null;
    const max = niceCeil(Math.max(...series.map((p) => p.revenue), 1));
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;
    const x = (i: number) => PAD_L + (i / (n - 1)) * plotW;
    const y = (v: number) => PAD_T + plotH - (v / max) * plotH;
    const pts = series.map((p, i) => ({ x: x(i), y: y(p.revenue) }));
    const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
    const area = `${line} ${x(n - 1)},${PAD_T + plotH} ${x(0)},${PAD_T + plotH}`;
    const ticks = fractionTicks(max).map((v) => ({ v, y: y(v) }));
    // Period context: the average revenue per bucket, and the peak bucket —
    // both get a quiet annotation so a spike reads as a fact, not a mystery.
    const avg = series.reduce((s, p) => s + p.revenue, 0) / n;
    const peakIdx = series.reduce((best, p, i) => (p.revenue > series[best].revenue ? i : best), 0);
    return { max, pts, line, area, ticks, plotH, plotW, y, avg, peakIdx };
  }, [series, n, W]);

  const xLabels = useMemo(() => labelIndices(n, maxXLabels(W - PAD_L - PAD_R)), [n, W]);

  // The SVG draws at its measured CSS width, so clientX maps 1:1 into the
  // viewBox — no letterbox/scale correction needed.
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!geom || n < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.round(((x - PAD_L) / geom.plotW) * (n - 1));
    setHoverRaw(Math.max(0, Math.min(n - 1, idx)));
  };

  return (
    <ChartCard
      title="Revenue"
      subtitle="Completed-booking revenue over the selected period"
      toggle={<ViewToggle view={view} onChange={setView} />}
    >
      {!hasData ? (
        <EmptyChart />
      ) : view === "table" ? (
        <SeriesTable
          series={series}
          columns={[
            { header: "Revenue", cell: (p) => inr(p.revenue) },
            { header: "Bookings", cell: (p) => num(p.bookings) },
          ]}
        />
      ) : (
        <div ref={wrapRef} className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-60 w-full"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Revenue trend, ${series.length} points, latest ${inr(series[n - 1].revenue)}`}
            onPointerMove={onMove}
            onPointerLeave={() => setHoverRaw(null)}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.14" />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* hairline grid + y ticks (solid, recessive) */}
            {geom!.ticks.map((t) => (
              <g key={t.v}>
                <line x1={PAD_L} x2={W - PAD_R} y1={t.y} y2={t.y} stroke="var(--chart-grid)" strokeWidth="1" />
                <text
                  x={PAD_L - 8}
                  y={t.y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--muted-foreground)"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {tickLabel(t.v, true)}
                </text>
              </g>
            ))}

            <polygon points={geom!.area} fill={`url(#${gradId})`} />
            <polyline
              points={geom!.line}
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* period-average reference line (under the hover marker) */}
            {geom!.avg > 0 && <AvgLine y={geom!.y(geom!.avg)} label={`avg ${tickLabel(geom!.avg, true)}`} W={W} />}

            {/* crosshair + snapped marker */}
            {hover != null && (
              <g>
                <line
                  x1={geom!.pts[hover].x}
                  x2={geom!.pts[hover].x}
                  y1={PAD_T}
                  y2={PAD_T + geom!.plotH}
                  stroke="var(--muted-foreground)"
                  strokeOpacity="0.4"
                  strokeWidth="1"
                />
                <circle
                  cx={geom!.pts[hover].x}
                  cy={geom!.pts[hover].y}
                  r="4.5"
                  fill="var(--chart-1)"
                  stroke="var(--card)"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* end-dot with surface ring */}
            <circle
              cx={geom!.pts[n - 1].x}
              cy={geom!.pts[n - 1].y}
              r="4"
              fill="var(--chart-1)"
              stroke="var(--card)"
              strokeWidth="2"
            />

            {/* peak annotation — marker + direct value label (selective: the
                one point the reader will ask about) */}
            {series[geom!.peakIdx].revenue > 0 && (
              <g pointerEvents="none">
                {geom!.peakIdx !== n - 1 && (
                  <circle
                    cx={geom!.pts[geom!.peakIdx].x}
                    cy={geom!.pts[geom!.peakIdx].y}
                    r="3.5"
                    fill="var(--chart-1)"
                    stroke="var(--card)"
                    strokeWidth="2"
                  />
                )}
                <text
                  x={Math.max(PAD_L + 18, Math.min(W - PAD_R - 18, geom!.pts[geom!.peakIdx].x))}
                  y={Math.max(PAD_T + 9, geom!.pts[geom!.peakIdx].y - 9)}
                  textAnchor="middle"
                  fontSize="10.5"
                  fontWeight={600}
                  fill="var(--foreground)"
                >
                  {tickLabel(series[geom!.peakIdx].revenue, true)}
                </text>
              </g>
            )}

            {/* x labels (subset, collision-free) */}
            {series.map((p, i) =>
              xLabels.has(i) ? (
                <text
                  key={p.date}
                  x={geom!.pts[i].x}
                  y={H - 8}
                  textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                  fontSize="10"
                  fill="var(--muted-foreground)"
                >
                  {p.label}
                </text>
              ) : null,
            )}

            {/* hovered date, highlighted on the axis */}
            {hover != null && <HoverDatePill x={geom!.pts[hover].x} label={series[hover].label} W={W} />}
          </svg>

          {hover != null && (
            <ChartTooltip xPx={geom!.pts[hover].x} containerW={W} title={fullDateLabel(series, hover)}>
              <TooltipRow color="var(--chart-1)" label="Revenue" value={inr(series[hover].revenue)} />
              <TooltipRow color="var(--muted-foreground)" label="Bookings" value={num(series[hover].bookings)} />
              <TooltipRow color="var(--success)" label="Completed" value={num(series[hover].completed)} />
              <TooltipRow color="var(--danger)" label="Cancelled" value={num(series[hover].cancelled)} />
              <TooltipRow
                color="var(--muted-foreground)"
                label="Avg order value"
                value={series[hover].completed > 0 ? inr(series[hover].revenue / series[hover].completed) : "—"}
              />
            </ChartTooltip>
          )}
        </div>
      )}
    </ChartCard>
  );
}

/* -------------------------- bookings outcome card ------------------------ */

const OUTCOME = [
  { key: "completed" as const, label: "Completed", color: "var(--success)" },
  { key: "inflight" as const, label: "In progress", color: "var(--muted-foreground)" },
  { key: "cancelled" as const, label: "Cancelled", color: "var(--danger)" },
];

export function BookingsTrendCard({ series }: { series: AnalyticsSeriesPoint[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [hoverRaw, setHoverRaw] = useState<number | null>(null);
  const [wrapRef, measuredW] = useMeasuredWidth();
  const W = measuredW || 640;

  const n = series.length;
  // Same stale-hover clamp as the revenue card.
  const hover = hoverRaw == null ? null : Math.min(hoverRaw, n - 1);
  const hasData = n > 0 && series.some((p) => p.bookings > 0);

  const rows = useMemo(
    () =>
      series.map((p) => ({
        ...p,
        inflight: Math.max(0, p.bookings - p.completed - p.cancelled),
      })),
    [series],
  );

  const geom = useMemo(() => {
    if (n === 0) return null;
    const max = Math.ceil(niceCeil(Math.max(...rows.map((p) => p.bookings), 1)));
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;
    const band = plotW / n;
    const barW = Math.min(24, Math.max(4, band * 0.55));
    const y = (v: number) => PAD_T + plotH - (v / max) * plotH;
    const ticks = integerTicks(max).map((v) => ({ v, y: y(v) }));
    // Period context for the annotations: average bookings per bucket and the
    // busiest bucket.
    const avg = rows.reduce((s, p) => s + p.bookings, 0) / n;
    const peakIdx = rows.reduce((best, p, i) => (p.bookings > rows[best].bookings ? i : best), 0);
    return { max, band, barW, y, ticks, plotH, plotW, avg, peakIdx };
  }, [rows, n, W]);

  const xLabels = useMemo(() => labelIndices(n, maxXLabels(W - PAD_L - PAD_R)), [n, W]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!geom || n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.floor(((x - PAD_L) / geom.plotW) * n);
    setHoverRaw(Math.max(0, Math.min(n - 1, idx)));
  };

  return (
    <ChartCard
      title="Bookings"
      subtitle="Bookings per period, split by outcome"
      legend={
        <div className="flex flex-wrap items-center gap-3">
          {OUTCOME.map((o) => (
            <LegendKey key={o.key} color={o.color} label={o.label} />
          ))}
        </div>
      }
      toggle={<ViewToggle view={view} onChange={setView} />}
    >
      {!hasData ? (
        <EmptyChart />
      ) : view === "table" ? (
        <SeriesTable
          series={series}
          columns={[
            { header: "Total", cell: (p) => num(p.bookings) },
            { header: "Completed", cell: (p) => num(p.completed) },
            { header: "In progress", cell: (p) => num(Math.max(0, p.bookings - p.completed - p.cancelled)) },
            { header: "Cancelled", cell: (p) => num(p.cancelled) },
          ]}
        />
      ) : (
        <div ref={wrapRef} className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-60 w-full"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Bookings per period split by outcome, ${n} periods`}
            onPointerMove={onMove}
            onPointerLeave={() => setHoverRaw(null)}
          >
            {geom!.ticks.map((t) => (
              <g key={t.v}>
                <line x1={PAD_L} x2={W - PAD_R} y1={t.y} y2={t.y} stroke="var(--chart-grid)" strokeWidth="1" />
                <text
                  x={PAD_L - 8}
                  y={t.y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--muted-foreground)"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {tickLabel(t.v, false)}
                </text>
              </g>
            ))}

            {rows.map((p, i) => {
              const cx = PAD_L + geom!.band * i + geom!.band / 2;
              const x0 = cx - geom!.barW / 2;
              const dim = hover != null && hover !== i;
              // Stack bottom-up: completed → in-flight → cancelled, 2px surface
              // gaps between segments; only the stack's top edge is rounded.
              // Non-zero segments keep a minimum visible height so a single
              // cancellation never disappears from a tall axis.
              const segs = OUTCOME.map((o) => ({ ...o, value: p[o.key] })).filter((s) => s.value > 0);
              let cursor = PAD_T + geom!.plotH;
              const drawn = segs.map((s, si) => {
                const raw = (s.value / geom!.max) * geom!.plotH;
                const gap = si > 0 ? 2 : 0;
                const hPx = Math.max(raw, 2.5 + gap);
                const top = cursor - hPx;
                const rect = { y: top, h: hPx - gap, seg: s };
                cursor = top;
                return rect;
              });
              return (
                <g key={p.date} opacity={dim ? 0.45 : 1} style={{ transition: "opacity 120ms" }}>
                  {drawn.map((r, ri) => {
                    const isTop = ri === drawn.length - 1;
                    if (r.h <= 0) return null;
                    // Top of the stack gets the 4px rounded data-end; everything
                    // below stays square (the baseline side is always square).
                    return isTop && r.h > 4 ? (
                      <path
                        key={r.seg.key}
                        d={`M${x0},${r.y + r.h} V${r.y + 4} Q${x0},${r.y} ${x0 + 4},${r.y} H${x0 + geom!.barW - 4} Q${x0 + geom!.barW},${r.y} ${x0 + geom!.barW},${r.y + 4} V${r.y + r.h} Z`}
                        fill={r.seg.color}
                      />
                    ) : (
                      <rect key={r.seg.key} x={x0} y={r.y} width={geom!.barW} height={r.h} fill={r.seg.color} />
                    );
                  })}
                </g>
              );
            })}

            {/* period-average reference line */}
            {geom!.avg > 0 && (
              <AvgLine y={geom!.y(geom!.avg)} label={`avg ${num(Math.round(geom!.avg))}`} W={W} />
            )}

            {/* busiest bucket gets its total as a direct label */}
            {rows[geom!.peakIdx].bookings > 0 && (
              <text
                pointerEvents="none"
                x={Math.max(
                  PAD_L + 12,
                  Math.min(W - PAD_R - 12, PAD_L + geom!.band * geom!.peakIdx + geom!.band / 2),
                )}
                y={Math.max(PAD_T + 9, geom!.y(rows[geom!.peakIdx].bookings) - 7)}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight={600}
                fill="var(--foreground)"
              >
                {num(rows[geom!.peakIdx].bookings)}
              </text>
            )}

            {series.map((p, i) =>
              xLabels.has(i) ? (
                <text
                  key={p.date}
                  x={PAD_L + geom!.band * i + geom!.band / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--muted-foreground)"
                >
                  {p.label}
                </text>
              ) : null,
            )}

            {/* hovered date, highlighted on the axis */}
            {hover != null && (
              <HoverDatePill x={PAD_L + geom!.band * hover + geom!.band / 2} label={series[hover].label} W={W} />
            )}
          </svg>

          {hover != null && (
            <ChartTooltip
              xPx={PAD_L + geom!.band * hover + geom!.band / 2}
              containerW={W}
              title={`${fullDateLabel(series, hover)} · ${num(series[hover].bookings)} bookings`}
            >
              {OUTCOME.map((o) => (
                <TooltipRow key={o.key} color={o.color} label={o.label} value={num(rows[hover][o.key])} />
              ))}
              <TooltipRow color="var(--chart-1)" label="Revenue" value={inr(series[hover].revenue)} />
            </ChartTooltip>
          )}
        </div>
      )}
    </ChartCard>
  );
}

/* ------------------------------- tooltip -------------------------------- */

const TIP_HALF = 92; // half the tooltip's max width, for pixel clamping

function ChartTooltip({
  xPx,
  containerW,
  title,
  children,
}: {
  xPx: number;
  containerW: number;
  title: string;
  children: React.ReactNode;
}) {
  // Pixel clamp so the tooltip stays inside the card at any width.
  const left =
    containerW <= TIP_HALF * 2 ? containerW / 2 : Math.max(TIP_HALF, Math.min(containerW - TIP_HALF, xPx));
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 max-w-46 -translate-x-1/2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg"
      style={{ left }}
    >
      <p className="mb-1 text-xs text-muted-foreground">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto pl-3 font-semibold text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}

/* ----------------------------- series table ------------------------------ */

function SeriesTable({
  series,
  columns,
}: {
  series: AnalyticsSeriesPoint[];
  columns: { header: string; cell: (p: AnalyticsSeriesPoint) => string }[];
}) {
  return (
    <div className="max-h-60 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Period</th>
            {columns.map((c) => (
              <th key={c.header} className="py-2 pr-4 text-right font-medium">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {series.map((p) => (
            <tr key={p.date} className="border-t border-border">
              <td className="py-2 pr-4 text-muted-foreground">{p.label}</td>
              {columns.map((c) => (
                <td
                  key={c.header}
                  className="py-2 pr-4 text-right font-medium text-foreground"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {c.cell(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------- horizontal bar list -------------------------- */

export interface BarRow {
  /** Stable identity for React keys — falls back to the label. */
  id?: string | number;
  label: string;
  value: number;
  /** Preformatted value shown at the bar end (defaults to the plain number). */
  display?: string;
  /** Small secondary text under the label (e.g. booking count). */
  secondary?: string;
}

/**
 * Horizontal magnitude bars — one series, so every bar wears the same hue and
 * carries its value as a direct end label (no tooltip needed to read it).
 */
export function BarList({ rows, color = "var(--chart-1)" }: { rows: BarRow[]; color?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (rows.length === 0 || rows.every((r) => r.value === 0)) {
    return <EmptyChart message="Nothing here for this period." />;
  }
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id ?? r.label} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm text-foreground">{r.label}</span>
            <span
              className="shrink-0 text-sm font-medium text-foreground"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {r.display ?? num(r.value)}
            </span>
          </div>
          {r.secondary ? <p className="-mt-0.5 mb-1 text-xs text-muted-foreground">{r.secondary}</p> : null}
          <div className="h-2.5 w-full">
            <div
              className="h-full transition-opacity group-hover:opacity-80"
              style={{
                width: `${Math.max((r.value / max) * 100, r.value > 0 ? 1.5 : 0)}%`,
                background: color,
                borderRadius: "0 4px 4px 0",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* --------------------------- payment split card --------------------------- */

const MODE_META: Record<string, { label: string; color: string }> = {
  COD: { label: "Cash on delivery", color: "var(--chart-1)" },
  RAZORPAY: { label: "Razorpay (online)", color: "var(--chart-2)" },
};

export function PaymentSplitCard({ modes }: { modes: AnalyticsPaymentMode[] }) {
  const total = modes.reduce((s, m) => s + m.amount, 0);
  return (
    <ChartCard title="Revenue by payment mode" subtitle="Completed bookings only">
      {total === 0 ? (
        <EmptyChart message="No completed bookings in this period." />
      ) : (
        <div className="space-y-4">
          {/* single stacked 100% bar, 2px surface gaps between segments */}
          <div className="flex h-4 w-full gap-0.5" role="img" aria-label="Revenue share by payment mode">
            {modes
              .filter((m) => m.amount > 0)
              .map((m, i, arr) => (
                <div
                  key={m.mode}
                  className="h-full"
                  style={{
                    width: `${(m.amount / total) * 100}%`,
                    background: MODE_META[m.mode]?.color ?? "var(--chart-4)",
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
            {modes.map((m) => {
              const meta = MODE_META[m.mode] ?? { label: m.mode, color: "var(--chart-4)" };
              const share = total > 0 ? Math.round((m.amount / total) * 100) : 0;
              return (
                <li key={m.mode} className="flex items-center gap-2.5 text-sm">
                  <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: meta.color }} />
                  <div className="min-w-0">
                    <p className="truncate text-foreground">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {num(m.bookings)} booking{m.bookings === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="font-medium text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {inr(m.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{share}%</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}

export { ChartCard };
