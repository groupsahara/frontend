"use client";

import type { RevenuePoint, StatCardData, TrafficSlice } from "@/src/api/api";
import { TrendDown, TrendUp } from "@/src/components/icons";

/* ------------------------------ Sparkline -------------------------------- */

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const w = 120;
  const h = 40;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / span) * (h - 6) - 3;
    return [x, y] as const;
  });
  const line = points.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `0,${h} ${line} ${w},${h}`;
  const stroke = up ? "var(--success)" : "var(--danger)";
  const id = `spark-${up ? "u" : "d"}-${data.join("-")}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------ Stat card -------------------------------- */

export function StatCard({ stat }: { stat: StatCardData }) {
  const up = stat.delta >= 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-lg hover:shadow-black/5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{stat.label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {stat.value}
          </p>
        </div>
        <span
          className={[
            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
            up ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
          ].join(" ")}
        >
          {up ? <TrendUp className="h-3.5 w-3.5" /> : <TrendDown className="h-3.5 w-3.5" />}
          {Math.abs(stat.delta)}%
        </span>
      </div>
      <div className="mt-3">
        <Sparkline data={stat.spark} up={up} />
      </div>
    </div>
  );
}

/* --------------------------- Revenue area chart -------------------------- */

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const w = 640;
  const h = 240;
  const padX = 8;
  const padTop = 16;
  const padBottom = 28;
  const values = data.map((d) => d.revenue);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const innerW = w - padX * 2;
  const innerH = h - padTop - padBottom;
  const step = innerW / (data.length - 1);

  const pts = data.map((d, i) => {
    const x = padX + i * step;
    const y = padTop + (1 - (d.revenue - min) / span) * innerH;
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `${padX},${padTop + innerH} ${line} ${padX + innerW},${padTop + innerH}`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Revenue</h3>
          <p className="text-sm text-muted-foreground">Last 8 months</p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Revenue (₹)
        </span>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="h-60 w-full">
        <defs>
          <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridLines.map((g) => {
          const y = padTop + g * innerH;
          return (
            <line
              key={g}
              x1={padX}
              y1={y}
              x2={padX + innerW}
              y2={y}
              stroke="var(--chart-grid)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        })}

        <polygon points={area} fill="url(#revArea)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {pts.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="3.5" fill="var(--card)" stroke="var(--chart-1)" strokeWidth="2" />
            <text
              x={x}
              y={h - 8}
              textAnchor="middle"
              fontSize="11"
              fill="var(--muted-foreground)"
            >
              {data[i].month}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ----------------------------- Donut chart ------------------------------- */

const DONUT_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export function TrafficDonut({ data }: { data: TrafficSlice[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  // Precompute each arc's dash length and starting offset (no in-render mutation).
  const arcs = data.reduce<{ label: string; value: number; dash: number; offset: number }[]>(
    (acc, slice) => {
      const prev = acc[acc.length - 1];
      const offset = prev ? prev.offset + prev.dash : 0;
      acc.push({
        label: slice.label,
        value: slice.value,
        dash: (slice.value / total) * circumference,
        offset,
      });
      return acc;
    },
    [],
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-base font-semibold text-foreground">Traffic sources</h3>
      <p className="text-sm text-muted-foreground">By acquisition channel</p>

      <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
        <div className="relative h-44 w-44">
          <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
            {arcs.map((arc, i) => (
              <circle
                key={arc.label}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                strokeWidth="18"
                strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
                strokeDashoffset={-arc.offset}
                strokeLinecap="butt"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold text-foreground">{total}%</span>
            <span className="text-xs text-muted-foreground">total</span>
          </div>
        </div>

        <ul className="space-y-2">
          {data.map((slice, i) => (
            <li key={slice.label} className="flex items-center gap-2 text-sm">
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
              />
              <span className="text-muted-foreground">{slice.label}</span>
              <span className="ml-auto font-medium text-foreground">{slice.value}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
