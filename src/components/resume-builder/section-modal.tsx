"use client";

import {
  SECTION_DEFS,
  SECTION_GALLERY_ORDER,
  type ResumeDocument,
  type SectionDef,
  type SectionType,
} from "@/src/lib/resume";
import { CloseIcon } from "@/src/components/icons";

/**
 * "Add a new section" gallery — mirrors the reference modal: card previews of
 * every section type, with already-used sections badged. Non-repeatable types
 * are disabled once used; Custom can be added any number of times.
 */
export function SectionModal({
  doc,
  onAdd,
  onRemove,
  onClose,
}: {
  doc: ResumeDocument;
  onAdd: (type: SectionType) => void;
  onRemove: (type: SectionType) => void;
  onClose: () => void;
}) {
  const usedTypes = new Set(doc.sections.map((s) => s.type));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 my-6 w-full max-w-5xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground">
          Add a new section
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Click on a section to add it to your resume — used sections are marked and can be removed.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SECTION_GALLERY_ORDER.map((type) => {
            const def = SECTION_DEFS[type];
            const used = usedTypes.has(type);
            const addable = !used || def.repeatable;
            return (
              <div key={type} className="flex flex-col gap-1.5">
                <button
                  type="button"
                  disabled={!addable}
                  onClick={() => addable && onAdd(type)}
                  className={`relative rounded-xl border bg-white p-4 text-left shadow-sm transition ${
                    addable
                      ? "border-border hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
                      : "cursor-default border-border opacity-55"
                  }`}
                >
                  <SectionPreview def={def} />
                  {used && (
                    <span className="absolute right-2 top-2 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
                      Added ✓
                    </span>
                  )}
                </button>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-medium text-foreground">{def.label}</span>
                  {used && !def.repeatable && (
                    <button
                      type="button"
                      onClick={() => onRemove(type)}
                      className="text-xs font-medium text-danger hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Static mini previews (always ink-on-white, like the printed page)  *
 * ------------------------------------------------------------------ */

function SectionPreview({ def }: { def: SectionDef }) {
  return (
    <div className="pointer-events-none h-40 overflow-hidden text-gray-800">
      <p className="border-b-2 border-gray-800 pb-1 text-[11px] font-bold uppercase tracking-wide">
        {def.defaultTitle}
      </p>
      <div className="mt-2">
        <PreviewBody def={def} />
      </div>
    </div>
  );
}

function PreviewBody({ def }: { def: SectionDef }) {
  const sample = def.sample;
  switch (def.kind) {
    case "tags":
      return (
        <div className="flex flex-wrap gap-1">
          {sample.map((s, i) => (
            <span key={i} className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-800">
              {s.title}
            </span>
          ))}
        </div>
      );
    case "levels":
      return (
        <div className="grid grid-cols-2 gap-2">
          {sample.map((s, i) => (
            <div key={i}>
              <p className="text-[10px] font-semibold">{s.title}</p>
              <p className="text-[8px] text-gray-500">{s.levelLabel}</p>
              <div className="mt-0.5 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`h-1.5 w-1.5 rounded-full ${n <= (s.level ?? 0) ? "bg-blue-600" : "bg-gray-200"}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    case "donut":
      return (
        <div className="flex items-center gap-2">
          <svg width={64} height={64} viewBox="0 0 64 64" aria-hidden>
            {[
              { from: 0, to: 0.3, c: "#1b49ae" },
              { from: 0.3, to: 0.45, c: "#2563eb" },
              { from: 0.45, to: 0.7, c: "#4c7fef" },
              { from: 0.7, to: 0.85, c: "#6b95f1" },
              { from: 0.85, to: 1, c: "#85a8f4" },
            ].map((s, i) => {
              const a0 = s.from * Math.PI * 2 - Math.PI / 2;
              const a1 = s.to * Math.PI * 2 - Math.PI / 2;
              const large = a1 - a0 > Math.PI ? 1 : 0;
              const p = (a: number, r: number) => `${32 + r * Math.cos(a)},${32 + r * Math.sin(a)}`;
              return (
                <path
                  key={i}
                  d={`M ${p(a0, 12)} L ${p(a0, 24)} A 24 24 0 ${large} 1 ${p(a1, 24)} L ${p(a1, 12)} A 12 12 0 ${large} 0 ${p(a0, 12)} Z`}
                  fill={s.c}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              );
            })}
          </svg>
          <ul className="space-y-0.5">
            {sample.slice(0, 4).map((s, i) => (
              <li key={i} className="flex items-center gap-1 text-[8px]">
                <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-gray-800 text-[6px] font-bold text-white">
                  {"ABCD"[i]}
                </span>
                <span className="truncate">{s.title}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "contacts":
      return (
        <div className="space-y-1.5">
          {sample.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-sm bg-blue-600 text-[8px] font-bold text-white">
                {(s.title ?? "•").charAt(0)}
              </span>
              <div>
                <p className="text-[10px] font-semibold leading-tight">{s.title}</p>
                <p className="text-[8px] text-gray-500">{s.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      );
    case "quote":
      return (
        <div>
          <p className="text-[10px] font-medium italic text-blue-700">“{sample[0]?.description}”</p>
          <p className="mt-1 text-right text-[9px] text-gray-500">{sample[0]?.subtitle}</p>
        </div>
      );
    case "signature":
      return (
        <p className="text-[22px] text-gray-800" style={{ fontFamily: "'Snell Roundhand', 'Segoe Script', 'Brush Script MT', cursive" }}>
          Your Name
        </p>
      );
    case "text":
      return <p className="text-[9px] leading-relaxed text-gray-600">{sample[0]?.description}</p>;
    case "entries":
    default:
      return (
        <div className="space-y-2">
          {sample.slice(0, 2).map((s, i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[10px] font-bold">{s.title}</p>
                {s.date && <p className="shrink-0 text-[8px] text-gray-400">{s.date}</p>}
              </div>
              {s.subtitle && <p className="text-[9px] font-medium text-blue-700">{s.subtitle}</p>}
              {s.description && <p className="line-clamp-2 text-[8.5px] text-gray-600">{s.description}</p>}
              {s.bullets && (
                <ul className="mt-0.5 list-disc space-y-0 pl-3">
                  {s.bullets.slice(0, 3).map((b, j) => (
                    <li key={j} className="line-clamp-1 text-[8.5px] text-gray-600">
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      );
  }
}
