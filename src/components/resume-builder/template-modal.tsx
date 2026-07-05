"use client";

import { RESUME_TEMPLATES, type TemplatePreset } from "@/src/lib/resume-templates";
import { CloseIcon } from "@/src/components/icons";

/** Template gallery — schematic thumbnails of all 20 presets. */
export function TemplateModal({
  current,
  onSelect,
  onClose,
}: {
  current: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 my-6 w-full max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
        <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground">
          Choose a template
        </h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {RESUME_TEMPLATES.length} designs — switch any time, your content is never touched.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {RESUME_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={`group flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ${
                t.id === current
                  ? "border-primary bg-accent"
                  : "border-border hover:border-primary/60 hover:bg-muted"
              }`}
            >
              <TemplateThumb preset={t} />
              <span
                className={`text-xs font-medium ${
                  t.id === current ? "text-accent-foreground" : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                {t.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Schematic mini-page: colored zones per layout + gray text lines. */
function TemplateThumb({ preset }: { preset: TemplatePreset }) {
  const lines = (n: number, light = false) => (
    <div className="space-y-1">
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          className="h-1 rounded-full"
          style={{
            width: `${88 - (i % 3) * 18}%`,
            background: light ? "rgba(255,255,255,0.55)" : "#d1d5db",
          }}
        />
      ))}
    </div>
  );

  const headerBlock = (bg: string, dark: boolean) => (
    <div className="px-2 py-1.5" style={{ background: bg }}>
      <div className="h-1.5 w-3/5 rounded-full" style={{ background: dark ? "#ffffff" : "#374151" }} />
      <div className="mt-1 h-1 w-2/5 rounded-full" style={{ background: dark ? "rgba(255,255,255,0.7)" : preset.accent }} />
    </div>
  );

  return (
    <div className="h-36 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-sm">
      {preset.layout === "topline" && <div style={{ background: preset.accent, height: 4 }} />}
      {headerBlock(
        preset.layout === "banner" ? (preset.headerBg ?? preset.accent) : "#ffffff",
        preset.layout === "banner" && !!preset.onDark,
      )}
      {preset.layout === "sidebar-left" || preset.layout === "sidebar-right" ? (
        <div className={`flex h-full ${preset.layout === "sidebar-right" ? "flex-row-reverse" : ""}`}>
          <div className="w-[36%] shrink-0 px-1.5 py-1.5" style={{ background: preset.sidebarBg }}>
            <div className="mb-1 h-1 w-4/5 rounded-full" style={{ background: preset.sidebarDark ? "#fff" : preset.accent }} />
            {lines(4, preset.sidebarDark)}
          </div>
          <div className="flex-1 px-1.5 py-1.5">
            <div className="mb-1 h-1 w-1/2 rounded-full" style={{ background: preset.accent }} />
            {lines(6)}
          </div>
        </div>
      ) : (
        <div className="px-2 py-1.5">
          <div className="mb-1 h-1 w-1/2 rounded-full" style={{ background: preset.accent }} />
          {lines(3)}
          <div className="mb-1 mt-2 h-1 w-2/5 rounded-full" style={{ background: preset.accent }} />
          {lines(3)}
        </div>
      )}
    </div>
  );
}
