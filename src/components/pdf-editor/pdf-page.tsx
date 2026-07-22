"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  CSS_FONT_STACKS,
  FONT_FAMILY_LABELS,
  cloneBackgroundTexture,
  composeRegionPng,
  cropCanvasRegion,
  editKey,
  extractTextBoxes,
  hexToRgb,
  rgbToCss,
  rgbToHex,
  sampleBackgroundColor,
  sampleTextColor,
  type FontFamilyKey,
  type PdfEdit,
  type PdfRect,
  type RegionEdit,
  type TextBox,
  type TextEdit,
} from "@/src/lib/pdf-editor";
import { pdfAiApi, type PdfRegionAnalysis } from "@/src/api/api";
import { SpinnerIcon } from "@/src/components/icons";

/* Shared canvas context for measuring replacement-text widths in previews. */
let measureCtx: CanvasRenderingContext2D | null = null;
function measureTextPx(text: string, cssFont: string): number {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return 0;
  measureCtx.font = cssFont;
  return measureCtx.measureText(text).width;
}

const rid = () => Math.random().toString(36).slice(2, 10);

type ViewportState = { t: number[]; scale: number };
type CssRect = { left: number; top: number; width: number; height: number };

const FAMILY_FROM_CATEGORY: Record<PdfRegionAnalysis["fontCategory"], FontFamilyKey> = {
  sans: "helvetica",
  serif: "times",
  mono: "courier",
};

interface PdfPageViewProps {
  doc: PDFDocumentProxy;
  pageIndex: number; // 0-based
  scale: number;
  editMode: boolean;
  edits: PdfEdit[]; // edits belonging to this page
  onApply: (edit: PdfEdit) => void;
  onRemove: (key: string) => void;
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
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [regionDraft, setRegionDraft] = useState<{ rectCss: CssRect; crop: string } | null>(null);

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
      setRegionDraft(null);
      setDrag(null);
    };
  }, [doc, pageIndex, scale, visible]);

  /* ----------------------- coordinate helpers ----------------------- */

  const s = vp?.scale ?? scale;
  const pdfPageHeight = size ? size.height / s : 0;

  const cssPoint = (x: number, y: number): [number, number] => {
    if (!vp) return [0, 0];
    const t = vp.t;
    return [t[0] * x + t[2] * y + t[4], t[1] * x + t[3] * y + t[5]];
  };

  const cssRectToPdf = (r: CssRect): PdfRect => ({
    x: r.left / s,
    y: pdfPageHeight - (r.top + r.height) / s,
    w: r.width / s,
    h: r.height / s,
  });

  const pdfRectToCss = (r: PdfRect): CssRect => ({
    left: r.x * s,
    top: (pdfPageHeight - r.y - r.h) * s,
    width: r.w * s,
    height: r.h * s,
  });

  const cssToCanvas = () =>
    canvasRef.current && size ? canvasRef.current.width / size.width : 1;

  /* ----------------------------- edits ------------------------------ */

  const textEdits = useMemo(
    () => edits.filter((e): e is TextEdit => e.kind === "text"),
    [edits],
  );
  const regionEdits = useMemo(
    () => edits.filter((e): e is RegionEdit => e.kind === "region"),
    [edits],
  );
  const editsById = useMemo(() => {
    const map = new Map<number, TextEdit>();
    textEdits.forEach((e) => map.set(e.boxId, e));
    return map;
  }, [textEdits]);

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
      const k = cssToCanvas();
      bg = sampleBackgroundColor(canvas, box, k);
      color = sampleTextColor(canvas, box, k, bg);
    }
    setDraft({
      kind: "text",
      key: editKey(pageIndex, box.id),
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
      angle: box.angle,
    });
  };

  /** Crop the box region and run the Gemini-vision analysis. */
  const analyzeBox = async (box: TextBox): Promise<PdfRegionAnalysis> => {
    const canvas = canvasRef.current;
    if (!canvas || !size) throw new Error("Page not rendered yet");
    const crop = cropCanvasRegion(
      canvas,
      { left: box.left - 4, top: box.top - 4, width: box.width + 8, height: box.height + 8 },
      cssToCanvas(),
    );
    if (!crop) throw new Error("Could not crop this region");
    return pdfAiApi.analyze(crop);
  };

  /** Aged-blend raster for a text edit (texture-cloned patch + soft text). */
  const composeBlend = async (
    edit: TextEdit,
  ): Promise<{ png: string; rect: PdfRect } | null> => {
    const canvas = canvasRef.current;
    if (!canvas || !size || edit.angle !== 0) return null;
    const { box } = edit;
    const patchFs = Math.max(box.fontSize, edit.fontSize);
    const cssFont = `${edit.italic ? "italic " : ""}${edit.bold ? "700 " : ""}${edit.fontSize}px ${CSS_FONT_STACKS[edit.family]}`;
    const newWidthPt = edit.text ? measureTextPx(edit.text, cssFont) : 0;
    const rect: PdfRect = {
      x: box.pdfX - 1,
      y: box.pdfBaseline - 0.25 * patchFs - 1,
      w: Math.max(box.pdfWidth, newWidthPt) + 2,
      h: 1.1 * patchFs + 2,
    };
    const rectCss = pdfRectToCss(rect);
    const k = cssToCanvas();
    const texture = cloneBackgroundTexture(canvas, rectCss, k);
    const png = await composeRegionPng({
      widthPt: rect.w,
      heightPt: rect.h,
      texture,
      bgColor: edit.bg,
      text: edit.text,
      style: {
        family: edit.family,
        sizePt: edit.fontSize,
        bold: edit.bold,
        italic: edit.italic,
        color: edit.color,
      },
      aged: true,
      blur: "slight",
    });
    return { png, rect };
  };

  const applyTextEdit = async (edit: TextEdit, aged: boolean) => {
    let final = edit;
    if (aged) {
      try {
        const blend = await composeBlend(edit);
        if (blend) final = { ...edit, blendPng: blend.png, blendRect: blend.rect };
      } catch {
        // blend failed — fall back to the vector patch
      }
    } else {
      final = { ...edit, blendPng: undefined, blendRect: undefined };
    }
    onApply(final);
    setDraft(null);
  };

  /* -------------------- marquee region selection -------------------- */

  const marqueeEnabled = editMode && rendered && !draft && !regionDraft;

  const pointFromEvent = (e: React.MouseEvent): [number, number] => {
    const rect = containerRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!marqueeEnabled || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("[data-popup]")) return;
    const [x, y] = pointFromEvent(e);
    setDrag({ x0: x, y0: y, x1: x, y1: y });
    e.preventDefault();
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag) return;
    const [x, y] = pointFromEvent(e);
    setDrag({ ...drag, x1: x, y1: y });
  };

  const onMouseUp = () => {
    if (!drag || !size) return;
    const rectCss: CssRect = {
      left: Math.max(0, Math.min(drag.x0, drag.x1)),
      top: Math.max(0, Math.min(drag.y0, drag.y1)),
      width: Math.min(size.width, Math.max(drag.x0, drag.x1)) - Math.max(0, Math.min(drag.x0, drag.x1)),
      height: Math.min(size.height, Math.max(drag.y0, drag.y1)) - Math.max(0, Math.min(drag.y0, drag.y1)),
    };
    setDrag(null);
    if (rectCss.width < 14 || rectCss.height < 10) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const crop = cropCanvasRegion(canvas, rectCss, cssToCanvas());
    if (crop) setRegionDraft({ rectCss, crop });
  };

  const dragRect: CssRect | null = drag
    ? {
        left: Math.min(drag.x0, drag.x1),
        top: Math.min(drag.y0, drag.y1),
        width: Math.abs(drag.x1 - drag.x0),
        height: Math.abs(drag.y1 - drag.y0),
      }
    : null;

  /* ------------------------------ render ---------------------------- */

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => setDrag(null)}
        className="relative overflow-hidden rounded-lg border border-border bg-white shadow-md"
        style={{
          ...(size ? { width: size.width, height: size.height } : { width: 640, height: 820 }),
          cursor: marqueeEnabled ? "crosshair" : undefined,
        }}
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

        {/* Region edits: fully composed rasters (erase / image-text replace) */}
        {vp &&
          regionEdits.map((edit) => {
            const r = pdfRectToCss(edit.rect);
            return (
              <div
                key={edit.key}
                className="group/region absolute"
                style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- composed data URL */}
                <img src={edit.png} alt="" className="h-full w-full" draggable={false} />
                {editMode && (
                  <button
                    type="button"
                    title="Revert this area"
                    onClick={() => onRemove(edit.key)}
                    className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full border border-red-200 bg-white text-[11px] text-red-600 shadow group-hover/region:flex print:!hidden"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}

        {/* Text edits: aged-blend raster, or slant-following patch + text */}
        {vp &&
          textEdits.map((edit) => {
            if (edit.blendPng && edit.blendRect) {
              const r = pdfRectToCss(edit.blendRect);
              return (
                // eslint-disable-next-line @next/next/no-img-element -- composed data URL
                <img
                  key={edit.key}
                  src={edit.blendPng}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute"
                  style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
                />
              );
            }
            const { box } = edit;
            const [bx, by] = cssPoint(box.pdfX, box.pdfBaseline);
            const fontPx = edit.fontSize * s;
            const cssFont = `${edit.italic ? "italic " : ""}${edit.bold ? "700 " : ""}${fontPx}px ${CSS_FONT_STACKS[edit.family]}`;
            const newWidth = edit.text ? measureTextPx(edit.text, cssFont) : 0;
            const patchFsPx = Math.max(box.fontSize, edit.fontSize) * s;
            return (
              <div
                key={edit.key}
                className="pointer-events-none absolute"
                style={{
                  left: bx,
                  top: by,
                  transform: edit.angle ? `rotate(${-edit.angle}deg)` : undefined,
                  transformOrigin: "0 0",
                }}
              >
                <div
                  className="absolute"
                  style={{
                    left: -s,
                    top: -0.85 * patchFsPx - s,
                    width: Math.max(box.pdfWidth * s, newWidth) + 2 * s,
                    height: 1.1 * patchFsPx + 2 * s,
                    background: rgbToCss(edit.bg),
                  }}
                />
                {edit.text && (
                  <span
                    className="absolute whitespace-pre"
                    style={{
                      left: 0,
                      top: -0.8 * fontPx,
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
                title={`${box.fontRaw} · ${box.fontSize} pt${box.angle ? ` · ${box.angle.toFixed(0)}°` : ""}`}
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
                  transform: box.angle ? `rotate(${-box.angle}deg)` : undefined,
                  transformOrigin: `2px ${2 + box.height * 0.76}px`,
                }}
              />
            );
          })}

        {/* Marquee selection rectangle */}
        {dragRect && (
          <div
            className="pointer-events-none absolute border-2 border-primary bg-primary/10"
            style={dragRect}
          />
        )}

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
            onAnalyze={() => analyzeBox(draft.box)}
            onApply={(edit, aged) => void applyTextEdit(edit, aged)}
            onRemove={() => {
              onRemove(draft.key);
              setDraft(null);
            }}
            onClose={() => setDraft(null)}
          />
        )}

        {regionDraft && size && (
          <RegionPopup
            rectCss={regionDraft.rectCss}
            crop={regionDraft.crop}
            pageSize={size}
            scale={s}
            onApply={async ({ text, style, aged, blur, erase, analysis }) => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const rect = cssRectToPdf(regionDraft.rectCss);
              const k = cssToCanvas();
              const texture = cloneBackgroundTexture(canvas, regionDraft.rectCss, k);
              const bgColor = analysis
                ? hexToRgb(analysis.backgroundHex)
                : sampleBackgroundColor(canvas, regionDraft.rectCss, k);
              const png = await composeRegionPng({
                widthPt: rect.w,
                heightPt: rect.h,
                texture,
                bgColor,
                text: erase ? undefined : text,
                style,
                aged,
                blur,
              });
              onApply({ kind: "region", key: `${pageIndex}:r:${rid()}`, pageIndex, rect, png });
              setRegionDraft(null);
            }}
            onClose={() => setRegionDraft(null)}
          />
        )}
      </div>
      <span className="text-xs text-muted-foreground">Page {pageIndex + 1}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Edit popup (text runs)                                             *
 * ------------------------------------------------------------------ */

const POPUP_WIDTH = 320;
const POPUP_HEIGHT = 330;

interface EditPopupProps {
  draft: TextEdit;
  anchor: { left: number; top: number; height: number };
  pageSize: { width: number; height: number };
  hasExisting: boolean;
  onAnalyze: () => Promise<PdfRegionAnalysis>;
  onApply: (edit: TextEdit, aged: boolean) => void;
  onRemove: () => void;
  onClose: () => void;
}

function EditPopup({
  draft,
  anchor,
  pageSize,
  hasExisting,
  onAnalyze,
  onApply,
  onRemove,
  onClose,
}: EditPopupProps) {
  const [edit, setEdit] = useState<TextEdit>(draft);
  const [aged, setAged] = useState(Boolean(draft.blendPng));
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);

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
      angle: prev.box.angle,
    }));

  const runAiMatch = async () => {
    setAiBusy(true);
    setAiNote(null);
    try {
      const a = await onAnalyze();
      setEdit((prev) => ({
        ...prev,
        family: FAMILY_FROM_CATEGORY[a.fontCategory],
        bold: a.bold,
        italic: a.italic,
        color: hexToRgb(a.colorHex),
        bg: hexToRgb(a.backgroundHex),
      }));
      if (a.aged) setAged(true);
      setAiNote(`AI: ${a.fontName || a.fontCategory}${a.aged ? " · aged document" : ""}`);
    } catch (err) {
      setAiNote((err as Error)?.message || "AI analysis failed");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div
      data-popup
      className="absolute z-20 rounded-xl border border-border bg-card p-4 shadow-2xl"
      style={{ left, top, width: POPUP_WIDTH }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") onApply(edit, aged);
      }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-card-foreground">Edit text</p>
        <p
          className="max-w-[190px] truncate text-right text-[11px] text-muted-foreground"
          title={`Detected font: ${edit.box.fontRaw} · ${edit.box.fontSize} pt${edit.box.angle ? ` · slant ${edit.box.angle.toFixed(1)}°` : ""}`}
        >
          {edit.box.fontRaw} · {edit.box.fontSize} pt
          {edit.box.angle ? ` · ${edit.box.angle.toFixed(0)}°` : ""}
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
          title="Re-match font family, size, style and slant to the original text"
        >
          Match original
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => void runAiMatch()}
          disabled={aiBusy}
          className="flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          title="AI reads this exact region and matches font, weight, color and aging"
        >
          {aiBusy ? <SpinnerIcon className="h-3 w-3 animate-spin" /> : "✨"} AI match style
        </button>
        {edit.angle === 0 && (
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground" title="Clone the surrounding paper texture and soften the new text so the edit blends into old/scanned documents">
            <input type="checkbox" checked={aged} onChange={(e) => setAged(e.target.checked)} />
            Blend (old doc)
          </label>
        )}
      </div>
      {aiNote && <p className="mt-1 truncate text-[11px] text-muted-foreground">{aiNote}</p>}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onApply(edit, aged)}
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

/* ------------------------------------------------------------------ *
 *  Region popup (marquee: AI read / erase / replace)                  *
 * ------------------------------------------------------------------ */

const REGION_POPUP_WIDTH = 340;

interface RegionApply {
  text: string;
  style: { family: FontFamilyKey; sizePt: number; bold: boolean; italic: boolean; color: { r: number; g: number; b: number } };
  aged: boolean;
  blur: PdfRegionAnalysis["blur"];
  erase: boolean;
  analysis: PdfRegionAnalysis | null;
}

function RegionPopup({
  rectCss,
  crop,
  pageSize,
  scale,
  onApply,
  onClose,
}: {
  rectCss: CssRect;
  crop: string;
  pageSize: { width: number; height: number };
  scale: number;
  onApply: (r: RegionApply) => Promise<void>;
  onClose: () => void;
}) {
  const [analysis, setAnalysis] = useState<PdfRegionAnalysis | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  const [text, setText] = useState("");
  const [family, setFamily] = useState<FontFamilyKey>("helvetica");
  const [sizePt, setSizePt] = useState(12);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [colorHex, setColorHex] = useState("#000000");
  const [aged, setAged] = useState(false);

  useEffect(() => {
    let cancelled = false;
    pdfAiApi
      .analyze(crop)
      .then((a) => {
        if (cancelled) return;
        setAnalysis(a);
        setText(a.text);
        setFamily(FAMILY_FROM_CATEGORY[a.fontCategory]);
        setBold(a.bold);
        setItalic(a.italic);
        setColorHex(/^#[0-9a-f]{6}$/i.test(a.colorHex) ? a.colorHex : "#000000");
        setAged(a.aged);
        const lines = Math.max(1, a.text.split("\n").length);
        const est = (rectCss.height / scale / lines) * 0.62;
        setSizePt(Math.min(96, Math.max(5, Math.round(est * 2) / 2)));
      })
      .catch((err: unknown) => {
        if (!cancelled) setAiError((err as Error)?.message || "AI analysis failed");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [crop, rectCss.height, scale]);

  const left = Math.max(8, Math.min(rectCss.left, pageSize.width - REGION_POPUP_WIDTH - 8));
  const below = rectCss.top + rectCss.height + 8;
  const top = below + 340 > pageSize.height ? Math.max(8, rectCss.top - 348) : below;

  const apply = (erase: boolean) => {
    setApplying(true);
    void onApply({
      text,
      style: { family, sizePt, bold, italic, color: hexToRgb(colorHex) },
      aged,
      blur: analysis?.blur ?? "none",
      erase,
      analysis,
    }).finally(() => setApplying(false));
  };

  return (
    <div
      data-popup
      className="absolute z-20 rounded-xl border border-border bg-card p-4 shadow-2xl"
      style={{ left, top, width: REGION_POPUP_WIDTH }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-card-foreground">✨ AI region edit</p>
        <p className="text-[11px] text-muted-foreground">
          {Math.round(rectCss.width / scale)} × {Math.round(rectCss.height / scale)} pt
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
          <SpinnerIcon className="h-4 w-4 animate-spin" />
          AI is reading this area (works on image text too)…
        </div>
      ) : (
        <>
          {aiError && (
            <p className="mb-2 rounded-lg border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-[11px] text-warning">
              {aiError} — you can still erase the area.
            </p>
          )}
          {analysis && (
            <p className="mb-2 truncate text-[11px] text-muted-foreground" title={analysis.fontName}>
              AI: {analysis.fontName || analysis.fontCategory}
              {analysis.aged ? " · aged document" : ""}
              {analysis.blur !== "none" ? ` · ${analysis.blur} blur` : ""}
            </p>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Replacement text (leave empty to just erase)"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />

          <div className="mt-2 flex gap-2">
            <select
              value={family}
              onChange={(e) => setFamily(e.target.value as FontFamilyKey)}
              className="flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              {(Object.keys(FONT_FAMILY_LABELS) as FontFamilyKey[]).map((key) => (
                <option key={key} value={key}>
                  {FONT_FAMILY_LABELS[key]}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={4}
              max={144}
              step={0.5}
              value={sizePt}
              onChange={(e) => setSizePt(Math.max(1, Number(e.target.value) || 12))}
              className="w-20 rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              title="Font size (pt)"
            />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBold(!bold)}
              className={`rounded-lg border px-2.5 py-1 text-sm font-bold transition ${
                bold ? "border-primary bg-accent text-accent-foreground" : "border-input text-muted-foreground hover:text-foreground"
              }`}
            >
              B
            </button>
            <button
              type="button"
              onClick={() => setItalic(!italic)}
              className={`rounded-lg border px-2.5 py-1 text-sm italic transition ${
                italic ? "border-primary bg-accent text-accent-foreground" : "border-input text-muted-foreground hover:text-foreground"
              }`}
            >
              I
            </button>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Color
              <input
                type="color"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="h-7 w-9 cursor-pointer rounded border border-input bg-background p-0.5"
              />
            </label>
            <label
              className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground"
              title="Clone surrounding paper texture + soften text so the edit matches old/scanned documents"
            >
              <input type="checkbox" checked={aged} onChange={(e) => setAged(e.target.checked)} />
              Blend (old doc)
            </label>
          </div>
        </>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={applying || loading || !text.trim()}
          onClick={() => apply(false)}
          className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {applying ? "Applying…" : "Replace text"}
        </button>
        <button
          type="button"
          disabled={applying}
          onClick={() => apply(true)}
          className="rounded-lg border border-input px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          title="Cover this area with cloned background — removes text, logos or stains"
        >
          Erase area
        </button>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
