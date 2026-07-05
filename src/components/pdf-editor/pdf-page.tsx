"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  CSS_FONT_STACKS,
  FONT_FAMILY_LABELS,
  extractTextBoxes,
  hexToRgb,
  rgbToCss,
  rgbToHex,
  sampleBackgroundColor,
  sampleTextColor,
  type FontFamilyKey,
  type TextBox,
  type TextEdit,
} from "@/src/lib/pdf-editor";
import { SpinnerIcon } from "@/src/components/icons";

/* Shared canvas context for measuring replacement-text widths in previews. */
let measureCtx: CanvasRenderingContext2D | null = null;
function measureTextPx(text: string, cssFont: string): number {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return 0;
  measureCtx.font = cssFont;
  return measureCtx.measureText(text).width;
}

type ViewportState = { t: number[]; scale: number };

interface PdfPageViewProps {
  doc: PDFDocumentProxy;
  pageIndex: number; // 0-based
  scale: number;
  editMode: boolean;
  edits: TextEdit[]; // edits belonging to this page
  onApply: (edit: TextEdit) => void;
  onRemove: (pageIndex: number, boxId: number) => void;
}

export function PdfPageView({
  doc,
  pageIndex,
  scale,
  editMode,
  edits,
  onApply,
  onRemove,
}: PdfPageViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [visible, setVisible] = useState(false);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [boxes, setBoxes] = useState<TextBox[]>([]);
  const [vp, setVp] = useState<ViewportState | null>(null);
  const [rendered, setRendered] = useState(false);
  const [draft, setDraft] = useState<TextEdit | null>(null);

  // Render pages lazily — a 20 MB PDF can hold hundreds of pages.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { rootMargin: "900px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<unknown> } | null = null;

    (async () => {
      const page = await doc.getPage(pageIndex + 1);
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      setSize({ width: viewport.width, height: viewport.height });
      if (!visible) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);

      setRendered(false);
      renderTask = page.render({
        canvas,
        viewport,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
      });
      await renderTask.promise;
      if (cancelled) return;

      // Font names resolve during render, so extraction must come after it.
      const textBoxes = await extractTextBoxes(page, viewport);
      if (cancelled) return;
      setBoxes(textBoxes);
      setVp({ t: Array.from(viewport.transform), scale: viewport.scale });
      setRendered(true);
    })().catch((err: unknown) => {
      if ((err as { name?: string })?.name !== "RenderingCancelledException") {
        console.error(`PDF page ${pageIndex + 1} failed to render`, err);
      }
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
      setDraft(null);
    };
  }, [doc, pageIndex, scale, visible]);

  /** PDF-space point -> CSS pixels inside this page container. */
  const cssPoint = (x: number, y: number): [number, number] => {
    if (!vp) return [0, 0];
    const t = vp.t;
    return [t[0] * x + t[2] * y + t[4], t[1] * x + t[3] * y + t[5]];
  };

  const editsById = useMemo(() => {
    const map = new Map<number, TextEdit>();
    edits.forEach((e) => map.set(e.boxId, e));
    return map;
  }, [edits]);

  const openEditor = (box: TextBox) => {
    const existing = editsById.get(box.id);
    if (existing) {
      setDraft({ ...existing });
      return;
    }
    const canvas = canvasRef.current;
    let bg = { r: 255, g: 255, b: 255 };
    let color = { r: 0, g: 0, b: 0 };
    if (canvas && size) {
      const cssToCanvas = canvas.width / size.width;
      bg = sampleBackgroundColor(canvas, box, cssToCanvas);
      color = sampleTextColor(canvas, box, cssToCanvas, bg);
    }
    setDraft({
      pageIndex,
      boxId: box.id,
      box,
      text: box.str,
      fontSize: box.fontSize,
      family: box.family,
      bold: box.bold,
      italic: box.italic,
      color,
      bg,
    });
  };

  const s = vp?.scale ?? scale;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-lg border border-border bg-white shadow-md"
        style={size ? { width: size.width, height: size.height } : { width: 640, height: 820 }}
      >
        <canvas
          ref={canvasRef}
          className="absolute left-0 top-0"
          style={size ? { width: size.width, height: size.height } : undefined}
        />

        {!rendered && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
            <SpinnerIcon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Applied edits: background patch + replacement text (live preview) */}
        {vp &&
          edits.map((edit) => {
            const { box } = edit;
            const [bx, by] = cssPoint(box.pdfX, box.pdfBaseline);
            const fontPx = edit.fontSize * s;
            const cssFont = `${edit.italic ? "italic " : ""}${edit.bold ? "700 " : ""}${fontPx}px ${CSS_FONT_STACKS[edit.family]}`;
            const newWidth = edit.text ? measureTextPx(edit.text, cssFont) : 0;
            const patchFsPx = Math.max(box.fontSize, edit.fontSize) * s;
            return (
              <div key={`edit-${edit.boxId}`} className="pointer-events-none absolute left-0 top-0">
                <div
                  className="absolute"
                  style={{
                    left: bx - s,
                    top: by - 0.85 * patchFsPx - s,
                    width: Math.max(box.pdfWidth * s, newWidth) + 2 * s,
                    height: 1.1 * patchFsPx + 2 * s,
                    background: rgbToCss(edit.bg),
                  }}
                />
                {edit.text && (
                  <span
                    className="absolute whitespace-pre"
                    style={{
                      left: bx,
                      top: by - 0.8 * fontPx,
                      font: cssFont,
                      lineHeight: 1,
                      color: rgbToCss(edit.color),
                    }}
                  >
                    {edit.text}
                  </span>
                )}
              </div>
            );
          })}

        {/* Edit mode: clickable hit-boxes over every detected text run */}
        {editMode &&
          rendered &&
          boxes.map((box) => {
            const edited = editsById.has(box.id);
            return (
              <button
                key={box.id}
                type="button"
                onClick={() => openEditor(box)}
                title={`${box.fontRaw} · ${box.fontSize} pt`}
                className={[
                  "absolute rounded-sm transition-colors",
                  edited
                    ? "outline outline-1 outline-dashed outline-success/70 hover:bg-success/10"
                    : "hover:bg-primary/10 hover:outline hover:outline-1 hover:outline-primary/60",
                  draft?.boxId === box.id ? "bg-primary/10 outline outline-1 outline-primary" : "",
                ].join(" ")}
                style={{
                  left: box.left - 2,
                  top: box.top - 2,
                  width: box.width + 4,
                  height: box.height + 4,
                }}
              />
            );
          })}

        {draft && size && (
          <EditPopup
            key={`${draft.boxId}-${s}`}
            draft={draft}
            pageSize={size}
            hasExisting={editsById.has(draft.boxId)}
            anchor={(() => {
              const box = boxes.find((b) => b.id === draft.boxId) ?? draft.box;
              return { left: box.left, top: box.top, height: box.height };
            })()}
            onApply={(edit) => {
              onApply(edit);
              setDraft(null);
            }}
            onRemove={() => {
              onRemove(pageIndex, draft.boxId);
              setDraft(null);
            }}
            onClose={() => setDraft(null)}
          />
        )}
      </div>
      <span className="text-xs text-muted-foreground">Page {pageIndex + 1}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Edit popup                                                         *
 * ------------------------------------------------------------------ */

const POPUP_WIDTH = 320;
const POPUP_HEIGHT = 290;

interface EditPopupProps {
  draft: TextEdit;
  anchor: { left: number; top: number; height: number };
  pageSize: { width: number; height: number };
  hasExisting: boolean;
  onApply: (edit: TextEdit) => void;
  onRemove: () => void;
  onClose: () => void;
}

function EditPopup({ draft, anchor, pageSize, hasExisting, onApply, onRemove, onClose }: EditPopupProps) {
  const [edit, setEdit] = useState<TextEdit>(draft);

  const left = Math.max(8, Math.min(anchor.left, pageSize.width - POPUP_WIDTH - 8));
  const below = anchor.top + anchor.height + 8;
  const top = below + POPUP_HEIGHT > pageSize.height ? Math.max(8, anchor.top - POPUP_HEIGHT - 8) : below;

  const set = <K extends keyof TextEdit>(key: K, value: TextEdit[K]) =>
    setEdit((prev) => ({ ...prev, [key]: value }));

  const resetToDetected = () =>
    setEdit((prev) => ({
      ...prev,
      fontSize: prev.box.fontSize,
      family: prev.box.family,
      bold: prev.box.bold,
      italic: prev.box.italic,
    }));

  return (
    <div
      className="absolute z-20 rounded-xl border border-border bg-card p-4 shadow-2xl"
      style={{ left, top, width: POPUP_WIDTH }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") onApply(edit);
      }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-card-foreground">Edit text</p>
        <p
          className="max-w-[190px] truncate text-right text-[11px] text-muted-foreground"
          title={`Detected font: ${edit.box.fontRaw} · ${edit.box.fontSize} pt`}
        >
          {edit.box.fontRaw} · {edit.box.fontSize} pt
        </p>
      </div>

      <input
        autoFocus
        value={edit.text}
        onChange={(e) => set("text", e.target.value)}
        placeholder="Replacement text (empty = erase)"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="mt-2 flex gap-2">
        <select
          value={edit.family}
          onChange={(e) => set("family", e.target.value as FontFamilyKey)}
          className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        >
          {(Object.keys(FONT_FAMILY_LABELS) as FontFamilyKey[]).map((key) => (
            <option key={key} value={key}>
              {FONT_FAMILY_LABELS[key]}
              {key === edit.box.family ? " · matched" : ""}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={4}
          max={144}
          step={0.5}
          value={edit.fontSize}
          onChange={(e) => set("fontSize", Math.max(1, Number(e.target.value) || edit.box.fontSize))}
          className="w-20 rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          title="Font size (pt)"
        />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => set("bold", !edit.bold)}
          className={`rounded-lg border px-2.5 py-1 text-sm font-bold transition ${
            edit.bold
              ? "border-primary bg-accent text-accent-foreground"
              : "border-input text-muted-foreground hover:text-foreground"
          }`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => set("italic", !edit.italic)}
          className={`rounded-lg border px-2.5 py-1 text-sm italic transition ${
            edit.italic
              ? "border-primary bg-accent text-accent-foreground"
              : "border-input text-muted-foreground hover:text-foreground"
          }`}
        >
          I
        </button>
        <label className="ml-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          Color
          <input
            type="color"
            value={rgbToHex(edit.color)}
            onChange={(e) => set("color", hexToRgb(e.target.value))}
            className="h-7 w-9 cursor-pointer rounded border border-input bg-background p-0.5"
          />
        </label>
        <button
          type="button"
          onClick={resetToDetected}
          className="ml-auto text-[11px] font-medium text-primary hover:underline"
          title="Re-match font family, size and style to the original text"
        >
          Match original
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onApply(edit)}
          className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-input px-3.5 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          Cancel
        </button>
        {hasExisting && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-auto rounded-lg px-2 py-1.5 text-sm font-medium text-danger transition hover:bg-danger/10"
          >
            Revert
          </button>
        )}
      </div>
    </div>
  );
}
