// Core helpers for the PDF editor tool.
//
// Rendering + text/font extraction is done with pdf.js; the edited file is
// produced with pdf-lib. Everything runs in the browser — the file never
// leaves the user's machine.
//
// Coordinate systems:
//   PDF space  — points, origin at the bottom-left of the page (pdf-lib).
//   CSS space  — pixels at the current render scale, origin top-left (overlay).

import type { PDFDocumentProxy, PDFPageProxy, PageViewport } from "pdfjs-dist";
import type { StandardFonts as StandardFontName } from "pdf-lib";

export const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB upload cap

export type RGB = { r: number; g: number; b: number };

export type FontFamilyKey = "helvetica" | "times" | "courier";

/** CSS stacks that visually approximate the three PDF standard families. */
export const CSS_FONT_STACKS: Record<FontFamilyKey, string> = {
  helvetica: "Helvetica, Arial, sans-serif",
  times: '"Times New Roman", Times, serif',
  courier: '"Courier New", Courier, monospace',
};

export const FONT_FAMILY_LABELS: Record<FontFamilyKey, string> = {
  helvetica: "Helvetica (Sans)",
  times: "Times (Serif)",
  courier: "Courier (Mono)",
};

/** One selectable run of text on a page, with its detected font metrics. */
export type TextBox = {
  id: number;
  str: string;
  // PDF space
  pdfX: number;
  pdfBaseline: number;
  pdfWidth: number;
  fontSize: number; // points
  // CSS space at the viewport this box was extracted from
  left: number;
  top: number;
  width: number;
  height: number;
  // Detected font
  fontRaw: string; // e.g. "Arial-BoldMT" (subset prefix stripped)
  family: FontFamilyKey;
  bold: boolean;
  italic: boolean;
};

/** A user edit applied to one text box. */
export type TextEdit = {
  pageIndex: number;
  boxId: number;
  box: TextBox; // snapshot of the original run (PDF-space fields are what matter)
  text: string;
  fontSize: number; // points
  family: FontFamilyKey;
  bold: boolean;
  italic: boolean;
  color: RGB; // replacement text color
  bg: RGB; // patch color sampled around the original text
};

export const editKey = (pageIndex: number, boxId: number) => `${pageIndex}:${boxId}`;

/* ------------------------------------------------------------------ *
 *  pdf.js loading (client-only, singleton)                            *
 * ------------------------------------------------------------------ */

type PdfJsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfJsModule> | null = null;

export function getPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

export async function loadPdfDocument(bytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfJs();
  // pdf.js transfers the buffer to its worker (detaching it), so hand it a copy
  // and keep the original for pdf-lib at export time.
  return pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise;
}

/* ------------------------------------------------------------------ *
 *  Font detection                                                     *
 * ------------------------------------------------------------------ */

export function classifyFont(name: string): {
  family: FontFamilyKey;
  bold: boolean;
  italic: boolean;
} {
  const n = name.toLowerCase();
  const bold = /(bold|black|heavy|semibold|demi)/.test(n);
  const italic = /(italic|oblique)/.test(n);
  let family: FontFamilyKey = "helvetica";
  if (/(courier|mono|consolas|menlo)/.test(n)) {
    family = "courier";
  } else if (
    !n.includes("sans") &&
    /(times|serif|georgia|garamond|palatino|bookman|minion|cambria|roman)/.test(n)
  ) {
    family = "times";
  }
  return { family, bold, italic };
}

/** pdf-lib StandardFonts value for a family + weight/style combination. */
export function standardFontName(
  family: FontFamilyKey,
  bold: boolean,
  italic: boolean,
): string {
  if (family === "courier") {
    if (bold && italic) return "Courier-BoldOblique";
    if (bold) return "Courier-Bold";
    if (italic) return "Courier-Oblique";
    return "Courier";
  }
  if (family === "times") {
    if (bold && italic) return "Times-BoldItalic";
    if (bold) return "Times-Bold";
    if (italic) return "Times-Italic";
    return "Times-Roman";
  }
  if (bold && italic) return "Helvetica-BoldOblique";
  if (bold) return "Helvetica-Bold";
  if (italic) return "Helvetica-Oblique";
  return "Helvetica";
}

/* ------------------------------------------------------------------ *
 *  Text extraction                                                    *
 * ------------------------------------------------------------------ */

type RawTextItem = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  fontName?: string;
};

/**
 * Extract positioned text runs with their detected font family + size.
 * Must run AFTER the page has been rendered once — pdf.js only exposes the
 * real (embedded) font names via `page.commonObjs` once rendering resolved them.
 */
export async function extractTextBoxes(
  page: PDFPageProxy,
  viewport: PageViewport,
): Promise<TextBox[]> {
  const content = await page.getTextContent();
  const styles = content.styles as Record<
    string,
    { fontFamily?: string; ascent?: number; descent?: number } | undefined
  >;

  const boxes: TextBox[] = [];
  let id = 0;

  for (const raw of content.items as RawTextItem[]) {
    if (!raw.str || !raw.str.trim() || !raw.transform) continue;

    const m = raw.transform; // text matrix in PDF space: [a, b, c, d, e, f]
    const fontSize = Math.hypot(m[2], m[3]);
    if (fontSize <= 0) continue;

    // Same matrix expressed in CSS space (handles page rotation for hit boxes).
    const v = viewport.transform;
    const t = [
      v[0] * m[0] + v[2] * m[1],
      v[1] * m[0] + v[3] * m[1],
      v[0] * m[2] + v[2] * m[3],
      v[1] * m[2] + v[3] * m[3],
      v[0] * m[4] + v[2] * m[5] + v[4],
      v[1] * m[4] + v[3] * m[5] + v[5],
    ];
    const fontHeightPx = Math.hypot(t[2], t[3]);

    const style = raw.fontName ? styles?.[raw.fontName] : undefined;
    const ascent = style?.ascent && style.ascent > 0 ? style.ascent : 0.8;
    const descent = style?.descent && style.descent < 0 ? Math.abs(style.descent) : 0.25;

    // Real font name only becomes available after render populates commonObjs.
    let fontRaw = "";
    if (raw.fontName) {
      try {
        const fontObj = page.commonObjs.get(raw.fontName) as { name?: string } | null;
        fontRaw = fontObj?.name ?? "";
      } catch {
        // font not resolved yet — fall back to the style's generic family
      }
    }
    fontRaw = fontRaw.replace(/^[A-Z]{6}\+/, ""); // strip subset tag "ABCDEF+"
    const detected = classifyFont(fontRaw || style?.fontFamily || "");

    boxes.push({
      id: id++,
      str: raw.str,
      pdfX: m[4],
      pdfBaseline: m[5],
      pdfWidth: raw.width ?? 0,
      fontSize: Math.round(fontSize * 10) / 10,
      left: t[4],
      top: t[5] - ascent * fontHeightPx,
      width: (raw.width ?? 0) * viewport.scale,
      height: (ascent + descent) * fontHeightPx,
      fontRaw: fontRaw || style?.fontFamily || "embedded font",
      ...detected,
    });
  }

  return boxes;
}

/* ------------------------------------------------------------------ *
 *  Canvas color sampling                                              *
 * ------------------------------------------------------------------ */

const quantKey = (r: number, g: number, b: number) =>
  ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);

const colorDist = (a: RGB, b: RGB) =>
  Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);

/**
 * Dominant color in a ring just OUTSIDE the text box — the color the patch
 * must be painted with so the edit doesn't punch a hole in the background.
 */
export function sampleBackgroundColor(
  canvas: HTMLCanvasElement,
  box: { left: number; top: number; width: number; height: number },
  cssToCanvas: number,
): RGB {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { r: 255, g: 255, b: 255 };

  const pad = Math.max(3, Math.round(3 * cssToCanvas));
  const ix0 = box.left * cssToCanvas;
  const iy0 = box.top * cssToCanvas;
  const ix1 = ix0 + box.width * cssToCanvas;
  const iy1 = iy0 + box.height * cssToCanvas;

  const x0 = Math.max(0, Math.floor(ix0 - pad));
  const y0 = Math.max(0, Math.floor(iy0 - pad));
  const x1 = Math.min(canvas.width, Math.ceil(ix1 + pad));
  const y1 = Math.min(canvas.height, Math.ceil(iy1 + pad));
  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) return { r: 255, g: 255, b: 255 };

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(x0, y0, w, h).data;
  } catch {
    return { r: 255, g: 255, b: 255 };
  }

  const counts = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cx = x0 + x;
      const cy = y0 + y;
      // ring only: skip pixels inside the text box itself (they contain glyphs)
      if (cx >= ix0 && cx < ix1 && cy >= iy0 && cy < iy1) continue;
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const key = quantKey(r, g, b);
      const entry = counts.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      entry.n += 1;
      entry.r += r;
      entry.g += g;
      entry.b += b;
      counts.set(key, entry);
    }
  }

  let best: { n: number; r: number; g: number; b: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.n > best.n) best = entry;
  }
  if (!best) return { r: 255, g: 255, b: 255 };
  return {
    r: Math.round(best.r / best.n),
    g: Math.round(best.g / best.n),
    b: Math.round(best.b / best.n),
  };
}

/** Dominant glyph color inside the text box (most frequent color that stands out from the background). */
export function sampleTextColor(
  canvas: HTMLCanvasElement,
  box: { left: number; top: number; width: number; height: number },
  cssToCanvas: number,
  bg: RGB,
): RGB {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { r: 0, g: 0, b: 0 };

  const x0 = Math.max(0, Math.floor(box.left * cssToCanvas));
  const y0 = Math.max(0, Math.floor(box.top * cssToCanvas));
  const w = Math.min(canvas.width - x0, Math.ceil(box.width * cssToCanvas));
  const h = Math.min(canvas.height - y0, Math.ceil(box.height * cssToCanvas));
  if (w <= 0 || h <= 0) return { r: 0, g: 0, b: 0 };

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(x0, y0, w, h).data;
  } catch {
    return { r: 0, g: 0, b: 0 };
  }

  const counts = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const px = { r: data[i], g: data[i + 1], b: data[i + 2] };
    if (colorDist(px, bg) < 70) continue; // background / anti-aliasing halo
    const key = quantKey(px.r, px.g, px.b);
    const entry = counts.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    entry.n += 1;
    entry.r += px.r;
    entry.g += px.g;
    entry.b += px.b;
    counts.set(key, entry);
  }

  let best: { n: number; r: number; g: number; b: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.n > best.n) best = entry;
  }
  if (!best) {
    // No pixel clearly distinct from the background — pick black or white by contrast.
    const lum = 0.299 * bg.r + 0.587 * bg.g + 0.114 * bg.b;
    return lum > 128 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
  }
  return {
    r: Math.round(best.r / best.n),
    g: Math.round(best.g / best.n),
    b: Math.round(best.b / best.n),
  };
}

/* ------------------------------------------------------------------ *
 *  Color format helpers                                               *
 * ------------------------------------------------------------------ */

export const rgbToCss = (c: RGB) => `rgb(${c.r}, ${c.g}, ${c.b})`;

export const rgbToHex = (c: RGB) =>
  "#" + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("");

export function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { r: 0, g: 0, b: 0 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/* ------------------------------------------------------------------ *
 *  Export with pdf-lib                                                *
 * ------------------------------------------------------------------ */

/**
 * Apply all edits to the original file: each edit paints a rectangle in the
 * sampled background color over the original run (so the page background is
 * preserved, not blanked to white), then draws the replacement text at the
 * same baseline with the matched standard font.
 */
export async function exportEditedPdf(
  original: ArrayBuffer,
  edits: TextEdit[],
): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import("pdf-lib");

  const doc = await PDFDocument.load(original.slice(0), { ignoreEncryption: true });
  const pages = doc.getPages();
  const fonts = new Map<string, Awaited<ReturnType<typeof doc.embedFont>>>();

  for (const edit of edits) {
    const page = pages[edit.pageIndex];
    if (!page) continue;

    const fontName = standardFontName(edit.family, edit.bold, edit.italic);
    let font = fonts.get(fontName);
    if (!font) {
      font = await doc.embedFont(fontName as StandardFontName);
      fonts.set(fontName, font);
    }

    // Standard fonts only encode WinAnsi — replace anything else so one odd
    // character doesn't abort the whole export.
    let text = "";
    for (const ch of edit.text) {
      try {
        font.encodeText(ch);
        text += ch;
      } catch {
        text += "?";
      }
    }

    const { box } = edit;
    const patchFontSize = Math.max(box.fontSize, edit.fontSize);
    const newWidth = text ? font.widthOfTextAtSize(text, edit.fontSize) : 0;

    page.drawRectangle({
      x: box.pdfX - 1,
      y: box.pdfBaseline - 0.25 * patchFontSize - 1,
      width: Math.max(box.pdfWidth, newWidth) + 2,
      height: 1.1 * patchFontSize + 2,
      color: rgb(edit.bg.r / 255, edit.bg.g / 255, edit.bg.b / 255),
    });

    if (text) {
      page.drawText(text, {
        x: box.pdfX,
        y: box.pdfBaseline,
        size: edit.fontSize,
        font,
        color: rgb(edit.color.r / 255, edit.color.g / 255, edit.color.b / 255),
      });
    }
  }

  return doc.save();
}

export function downloadBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
