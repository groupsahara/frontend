"use client";

import { useEffect, useMemo, useState } from "react";
import type { TutorVisual, TutorVisualColor, TutorVisualItem } from "@/src/api/api";
import { CloseIcon } from "@/src/components/icons";

const INK: Record<TutorVisualColor, string> = {
  ink: "#fdf6e0",
  gold: "#f5c86a",
  sky: "#7ec3f5",
  rose: "#f08bab",
  mint: "#7fe0b0",
};

const STEP_MS = 4500;

type Scene = Extract<TutorVisual, { applicable: true }>;

interface TutorBoardProps {
  visual: Scene;
  onClose: () => void;
}

/**
 * The angel's whiteboard — a floating slate of light that draws the lesson's
 * example step by step. Steps are cumulative: navigating to step N shows
 * everything from steps 1..N, with the newest step's items animating in.
 */
export function TutorBoard({ visual, onClose }: TutorBoardProps) {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);

  // A replaced scene starts from its first step, auto-playing again —
  // adjusted during render (not an effect), per the React "derived state
  // reset" pattern.
  const [prevVisual, setPrevVisual] = useState(visual);
  if (prevVisual !== visual) {
    setPrevVisual(visual);
    setStep(0);
    setAuto(true);
  }

  useEffect(() => {
    if (!auto || step >= visual.steps.length - 1) return;
    const t = window.setTimeout(() => setStep((v) => v + 1), STEP_MS);
    return () => window.clearTimeout(t);
  }, [auto, step, visual]);

  const goTo = (i: number) => {
    setAuto(false);
    setStep(Math.max(0, Math.min(visual.steps.length - 1, i)));
  };

  // Cumulative drawing: previous steps render static, current step animates.
  const settled = useMemo(
    () => visual.steps.slice(0, step).flatMap((s) => s.items),
    [visual, step],
  );
  const fresh = visual.steps[step]?.items ?? [];
  const caption = visual.steps[step]?.caption ?? "";

  return (
    <div className="tutor-board pointer-events-auto flex w-full flex-col overflow-hidden rounded-2xl border border-amber-200/80 bg-indigo-950/80 shadow-xl shadow-indigo-400/30 backdrop-blur-md">
      {/* header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.25em] text-amber-200/80">Visual example</p>
          {visual.title && <p className="truncate text-sm font-medium text-amber-50">{visual.title}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-indigo-300 transition-colors hover:text-white"
          title="Close the board"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      {/* slate */}
      <svg viewBox="0 0 100 75" className="w-full">
        <rect x="0" y="0" width="100" height="75" fill="transparent" />
        {settled.map((item, i) => (
          <g key={`s-${i}`}>{renderItem(item, i)}</g>
        ))}
        {fresh.map((item, i) => (
          <g key={`f-${step}-${i}`} className="tb-new" style={{ animationDelay: `${i * 0.25}s` }}>
            {renderItem(item, i)}
          </g>
        ))}
      </svg>

      {/* caption + navigation */}
      <div className="flex items-center gap-2 border-t border-white/10 px-3 py-2">
        <button
          type="button"
          onClick={() => goTo(step - 1)}
          disabled={step === 0}
          className="shrink-0 rounded-lg px-2 py-1 text-xs text-indigo-200 transition-colors hover:bg-white/10 disabled:opacity-30"
        >
          ‹ Prev
        </button>
        <p className="min-w-0 flex-1 text-center text-xs leading-snug text-amber-50/90">{caption}</p>
        <button
          type="button"
          onClick={() => goTo(step + 1)}
          disabled={step >= visual.steps.length - 1}
          className="shrink-0 rounded-lg px-2 py-1 text-xs text-indigo-200 transition-colors hover:bg-white/10 disabled:opacity-30"
        >
          Next ›
        </button>
      </div>
      <div className="flex items-center justify-center gap-1.5 pb-2">
        {visual.steps.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Step ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-amber-300" : "w-1.5 bg-indigo-400/50 hover:bg-indigo-300"}`}
          />
        ))}
      </div>

      <style>{`
        .tutor-board .tb-new { animation: tbIn 0.5s ease both; }
        @keyframes tbIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
        .tutor-board svg { display: block; }
        .tutor-board svg text { font-family: ui-rounded, "Segoe UI", system-ui, sans-serif; }
      `}</style>
    </div>
  );
}

/* ------------------------------ primitives ------------------------------- */

const SW = 0.8; // stroke width in board units

function renderItem(item: TutorVisualItem, key: number) {
  switch (item.type) {
    case "text":
      return (
        <text key={key} x={item.x} y={item.y} fontSize={item.size} fill={INK[item.color]} textAnchor="middle">
          {item.text}
        </text>
      );
    case "line":
      return (
        <line key={key} x1={item.x1} y1={item.y1} x2={item.x2} y2={item.y2} stroke={INK[item.color]} strokeWidth={SW} strokeLinecap="round" strokeDasharray={item.dashed ? "2 2" : undefined} />
      );
    case "arrow":
      return <Arrow key={key} {...item} />;
    case "circle":
      return (
        <circle key={key} cx={item.x} cy={item.y} r={item.r} stroke={INK[item.color]} strokeWidth={SW} fill={item.fill ? `${INK[item.color]}55` : "none"} />
      );
    case "rect":
      return (
        <rect key={key} x={item.x} y={item.y} width={item.w} height={item.h} rx={0.8} stroke={INK[item.color]} strokeWidth={SW} fill={item.fill ? `${INK[item.color]}55` : "none"} />
      );
    case "polygon":
      return (
        <polygon key={key} points={item.points.map((p) => p.join(",")).join(" ")} stroke={INK[item.color]} strokeWidth={SW} strokeLinejoin="round" fill={item.fill ? `${INK[item.color]}55` : "none"} />
      );
    case "polyline":
      return (
        <polyline key={key} points={item.points.map((p) => p.join(",")).join(" ")} stroke={INK[item.color]} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      );
    case "point":
      return (
        <g key={key}>
          <circle cx={item.x} cy={item.y} r={1.3} fill="#f5c86a" />
          {item.label && (
            <text x={item.x} y={item.y - 2.4} fontSize={3.4} fill="#fdf6e0" textAnchor="middle">
              {item.label}
            </text>
          )}
        </g>
      );
    case "number-line":
      return <NumberLine key={key} {...item} />;
    case "fraction-circle":
      return <FractionCircle key={key} {...item} />;
    case "angle":
      return <Angle key={key} {...item} />;
  }
}

function Arrow({ x1, y1, x2, y2, color }: Extract<TutorVisualItem, { type: "arrow" }>) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Two short strokes angled back from the tip form the head.
  const head = (side: number) => {
    const a = Math.atan2(uy, ux) + side * 2.6;
    return `${x2 + Math.cos(a) * 3},${y2 + Math.sin(a) * 3}`;
  };
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK[color]} strokeWidth={SW} strokeLinecap="round" />
      <polyline points={`${head(1)} ${x2},${y2} ${head(-1)}`} stroke={INK[color]} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>
  );
}

function NumberLine({ y, from, to, highlights }: Extract<TutorVisualItem, { type: "number-line" }>) {
  const x = (v: number) => 8 + ((v - from) / (to - from)) * 84;
  const marks: number[] = [];
  for (let v = from; v <= to; v++) marks.push(v);
  return (
    <g>
      <line x1={6} y1={y} x2={94} y2={y} stroke={INK.ink} strokeWidth={SW} strokeLinecap="round" />
      {marks.map((v) => (
        <g key={v}>
          <line x1={x(v)} y1={y - 1.4} x2={x(v)} y2={y + 1.4} stroke={INK.ink} strokeWidth={0.5} />
          <text x={x(v)} y={y + 5.2} fontSize={3} fill={INK.ink} textAnchor="middle">
            {v}
          </text>
        </g>
      ))}
      {highlights.map((v, i) => (
        <circle key={`h-${i}`} cx={x(v)} cy={y} r={1.5} fill={INK.gold} />
      ))}
    </g>
  );
}

function FractionCircle({ x, y, r, num, den }: Extract<TutorVisualItem, { type: "fraction-circle" }>) {
  if (den <= 1) {
    return <circle cx={x} cy={y} r={r} stroke={INK.ink} strokeWidth={SW} fill={num >= 1 ? `${INK.gold}66` : "none"} />;
  }
  const slice = (i: number) => {
    const a0 = (i / den) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / den) * Math.PI * 2 - Math.PI / 2;
    const large = 1 / den > 0.5 ? 1 : 0;
    return `M ${x} ${y} L ${x + r * Math.cos(a0)} ${y + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${x + r * Math.cos(a1)} ${y + r * Math.sin(a1)} Z`;
  };
  return (
    <g>
      {Array.from({ length: den }, (_, i) => (
        <path key={i} d={slice(i)} stroke={INK.ink} strokeWidth={0.5} fill={i < num ? `${INK.gold}66` : "none"} />
      ))}
      <circle cx={x} cy={y} r={r} stroke={INK.ink} strokeWidth={SW} fill="none" />
    </g>
  );
}

function Angle({ x, y, start, end, r, label }: Extract<TutorVisualItem, { type: "angle" }>) {
  // Math convention (counterclockwise from +x) on a y-down canvas → negate.
  const px = (deg: number, rad: number) => x + rad * Math.cos((-deg * Math.PI) / 180);
  const py = (deg: number, rad: number) => y + rad * Math.sin((-deg * Math.PI) / 180);
  const large = Math.abs(end - start) > 180 ? 1 : 0;
  const mid = (start + end) / 2;
  return (
    <g>
      <line x1={x} y1={y} x2={px(start, r)} y2={py(start, r)} stroke={INK.ink} strokeWidth={SW} strokeLinecap="round" />
      <line x1={x} y1={y} x2={px(end, r)} y2={py(end, r)} stroke={INK.ink} strokeWidth={SW} strokeLinecap="round" />
      <path d={`M ${px(start, r * 0.5)} ${py(start, r * 0.5)} A ${r * 0.5} ${r * 0.5} 0 ${large} 0 ${px(end, r * 0.5)} ${py(end, r * 0.5)}`} stroke={INK.gold} strokeWidth={0.6} fill="none" />
      {label && (
        <text x={px(mid, r * 0.72)} y={py(mid, r * 0.72)} fontSize={3.4} fill={INK.gold} textAnchor="middle">
          {label}
        </text>
      )}
    </g>
  );
}
