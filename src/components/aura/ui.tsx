"use client";

/**
 * Aura-specific presentation pieces for the panel's Aura tab.
 *
 * Charting rules followed here (see the dataviz method):
 *  • every plot is SINGLE-SERIES, drawn in one hue (`--primary`), which passes
 *    the palette validator against both the light (#ffffff) and dark (#0f1830)
 *    card surfaces — so there is no categorical ramp to go colour-blind-unsafe;
 *  • identity always comes from a direct text label, never from colour alone;
 *  • category tinting is a STATUS encoding (does this category help or hurt the
 *    score), it always ships with the category name AND its signed weight, and
 *    it is never used as a chart series colour;
 *  • one axis per chart, recessive grid, thin marks, 4px rounded data-ends.
 */

import type { ReactNode } from "react";
import type { AuraCategory } from "@/src/api/api";

/* ------------------------------ formatting ------------------------------- */

export function formatMinutes(minutes: number): string {
  if (!minutes) return "0m";
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export const formatDayLabel = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

/* ------------------------------- stat tile ------------------------------- */

/**
 * A single number is not a chart — per the form heuristic these are stat tiles,
 * not one-bar plots.
 */
export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold tabular-nums ${
          tone === "warning" ? "text-warning" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ---------------------------- category badge ----------------------------- */

/**
 * How a category affects the productivity score. This is deliberately a
 * three-tone status scale rather than ten hues: ten distinguishable categorical
 * colours cannot pass CVD separation, and "does it help or hurt" is the thing
 * an admin actually reads off the row.
 */
const CATEGORY_TONE: Record<AuraCategory, "positive" | "neutral" | "negative"> = {
  PRODUCTIVITY: "positive",
  LEARNING: "positive",
  HEALTH: "positive",
  FINANCE: "positive",
  COMMUNICATION: "neutral",
  UTILITY: "neutral",
  OTHER: "neutral",
  SOCIAL: "negative",
  ENTERTAINMENT: "negative",
  GAMING: "negative",
};

const TONE_CLASS = {
  positive: "bg-success/10 text-success ring-1 ring-success/20",
  neutral: "bg-muted-foreground/10 text-muted-foreground ring-1 ring-border",
  negative: "bg-danger/10 text-danger ring-1 ring-danger/20",
} as const;

export const categoryLabel = (category: AuraCategory) =>
  category.charAt(0) + category.slice(1).toLowerCase();

export function CategoryBadge({ category }: { category: AuraCategory }) {
  const tone = CATEGORY_TONE[category] ?? "neutral";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASS[tone]}`}
    >
      {/* Shape, not just colour — the glyph survives greyscale and CVD. */}
      <span aria-hidden>{tone === "positive" ? "▲" : tone === "negative" ? "▼" : "■"}</span>
      {categoryLabel(category)}
    </span>
  );
}

/* -------------------------------- charts --------------------------------- */

/**
 * Single-series vertical bars (e.g. daily active users).
 * Values are labelled on hover; the max is called out directly so the reader
 * never has to measure a bar against the axis.
 */
export function BarChart({
  data,
  valueLabel,
  height = 160,
}: {
  data: { label: string; value: number; title?: string }[];
  valueLabel: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <ChartEmpty />;

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((point, index) => {
          const pct = (point.value / max) * 100;
          const isMax = point.value === max;
          return (
            <div
              key={`${point.label}-${index}`}
              className="group relative flex h-full flex-1 flex-col justify-end"
              title={point.title ?? `${point.label}: ${point.value} ${valueLabel}`}
            >
              {/* Rounded data-end anchored to the baseline. */}
              <div
                className="w-full rounded-t bg-primary transition-opacity group-hover:opacity-80"
                style={{ height: `${Math.max(pct, point.value ? 3 : 0)}%`, minHeight: point.value ? 2 : 0 }}
              />
              {isMax && (
                <span className="pointer-events-none absolute inset-x-0 -top-0.5 text-center text-[10px] font-semibold tabular-nums text-foreground">
                  {point.value}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/**
 * Single-series line over time (e.g. a user's 30-day productivity score).
 * Fixed 0-100 domain because the score is a bounded index — rescaling it to the
 * data range would exaggerate ordinary variation.
 */
export function ScoreLine({
  data,
  height = 180,
}: {
  data: { day: string; score: number }[];
  height?: number;
}) {
  if (data.length < 2) return <ChartEmpty label="Not enough tracked days yet" />;

  const width = 600;
  const padY = 10;
  const stepX = width / (data.length - 1);
  const y = (score: number) => padY + (1 - score / 100) * (height - padY * 2);
  const points = data.map((point, index) => `${index * stepX},${y(point.score)}`).join(" ");
  const last = data[data.length - 1];
  const average = Math.round(data.reduce((sum, d) => sum + d.score, 0) / data.length);

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`Productivity score over ${data.length} days, ending at ${last.score} out of 100`}
      >
        {/* Recessive gridlines at the quartiles. */}
        {[0, 25, 50, 75, 100].map((tick) => (
          <line
            key={tick}
            x1={0}
            x2={width}
            y1={y(tick)}
            y2={y(tick)}
            className="stroke-border"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <polyline
          points={points}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Only the newest point gets a marker — a dot on every day is noise. */}
        <circle
          cx={(data.length - 1) * stepX}
          cy={y(last.score)}
          r={4}
          className="fill-primary"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{formatDayLabel(data[0].day)}</span>
        <span className="tabular-nums">
          avg {average} · latest {last.score}/100
        </span>
        <span>{formatDayLabel(last.day)}</span>
      </div>
    </div>
  );
}

/**
 * Ranked horizontal bars with the name written on the row itself. Because the
 * label carries identity, the bar only has to carry magnitude — one hue, no
 * legend, no colour-coded categories.
 */
export function RankedBars({
  rows,
  unit = "",
}: {
  rows: { label: string; value: number; badge?: ReactNode; display?: string }[];
  unit?: string;
}) {
  if (!rows.length) return <ChartEmpty />;
  const max = Math.max(1, ...rows.map((row) => row.value));

  return (
    <ul className="space-y-3">
      {rows.map((row, index) => (
        <li key={`${row.label}-${index}`}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium text-foreground">{row.label}</span>
              {row.badge}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {row.display ?? `${row.value}${unit}`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max((row.value / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ChartEmpty({ label = "No data yet" }: { label?: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
      {label}
    </div>
  );
}

/* ------------------------------ section card ----------------------------- */

export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
