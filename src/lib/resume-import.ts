/**
 * "Upload your resume" import pipeline (client side).
 *
 * 1. extractResumeText — positional text extraction from the uploaded PDF.
 *    Instead of pdf.js content order (which scrambles multi-column resumes),
 *    items are rebuilt into visual lines and a column gutter is detected per
 *    page, so the text reads exactly like the rendered page in the PDF tool.
 *    Column regions are wrapped in [SIDEBAR]/[MAIN] markers.
 * 2. The text goes to POST /v1/resume/ai/import, where Gemini buckets it into
 *    document-shaped JSON — markers let it tag each section's column and it
 *    keeps the resume's original headings verbatim.
 * 3. normalizeImportedDoc — coerce that AI output into a strictly valid
 *    ResumeDocument (ids, columns, known section types, clamped levels).
 */

import { getPdfJs } from "@/src/lib/pdf-editor";
import {
  SECTION_DEFS,
  uid,
  type ResumeDocument,
  type ResumeItem,
  type ResumeSection,
  type SectionType,
} from "@/src/lib/resume";

export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

export type ExtractedResume = {
  text: string;
  /** true when at least one page has a two-column layout */
  twoColumn: boolean;
  /** which side the narrow (sidebar) column sits on, when two-column */
  sidebarSide: "left" | "right" | null;
};

/* ------------------------------------------------------------------ *
 *  Positional page-text reconstruction (pure — unit-testable)         *
 * ------------------------------------------------------------------ */

export type PdfTextItem = { str: string; x: number; y: number; w: number };

const LINE_TOLERANCE = 4; // pt — baselines closer than this are one visual line
const MIN_GUTTER = 14; // pt — narrowest vertical band that counts as a column gap
const MIN_COLUMN_ITEMS = 6; // both sides need real content to call it two-column

/** Group items into visual lines (top→bottom, left→right) and join. */
function linesOf(items: PdfTextItem[]): string {
  const sorted = items.slice().sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: string[][] = [];
  let lastY = Infinity;
  for (const item of sorted) {
    if (Math.abs(lastY - item.y) > LINE_TOLERANCE) {
      lines.push([]);
      lastY = item.y;
    }
    lines[lines.length - 1].push(item.str);
  }
  return lines
    .map((l) => l.join(" ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * Column gutter: the vertical band in the middle of the page crossed by the
 * fewest items. A perfectly empty band is too strict — a centered name or a
 * full-width contact line crosses any real gutter; those few crossers are
 * tolerated here and emitted as banner text by layoutPageText.
 */
function findGutter(items: PdfTextItem[], pageWidth: number): number | null {
  if (items.length < MIN_COLUMN_ITEMS * 2) return null;
  const lo = pageWidth * 0.24;
  const hi = pageWidth * 0.76;
  const maxCross = Math.max(2, Math.ceil(items.length * 0.06));
  const step = 3;

  // Longest contiguous run of positions where few enough items cross.
  let best: { start: number; end: number } | null = null;
  let run: { start: number; end: number } | null = null;
  for (let g = lo; g <= hi; g += step) {
    const cross = items.reduce(
      (n, i) => n + (i.x < g && i.x + Math.max(i.w, 1) > g ? 1 : 0),
      0,
    );
    if (cross <= maxCross) {
      run = run ? { start: run.start, end: g } : { start: g, end: g };
      if (!best || run.end - run.start > best.end - best.start) best = run;
    } else {
      run = null;
    }
  }
  if (!best || best.end - best.start < MIN_GUTTER) return null;

  const gutterX = (best.start + best.end) / 2;
  const left = items.filter((i) => i.x + i.w <= gutterX).length;
  const right = items.filter((i) => i.x >= gutterX).length;
  return left >= MIN_COLUMN_ITEMS && right >= MIN_COLUMN_ITEMS ? gutterX : null;
}

/**
 * Rebuild one page's text in visual order. Two-column pages come back as
 * banner text (full-width header) + [SIDEBAR] and [MAIN] labelled regions.
 */
export function layoutPageText(
  items: PdfTextItem[],
  pageWidth: number,
): { text: string; sidebarSide: "left" | "right" | null } {
  const content = items.filter((i) => i.str.trim());
  // Full-width runs (name, headline, divider text) would mask the gutter —
  // detect columns without them, then emit them first as the banner.
  const narrow = content.filter((i) => i.w <= pageWidth * 0.55);
  const gutter = findGutter(narrow, pageWidth);

  if (gutter === null) {
    return { text: linesOf(content), sidebarSide: null };
  }

  const banner = content.filter((i) => i.x < gutter && i.x + i.w > gutter);
  const left = content.filter((i) => i.x + i.w <= gutter);
  const right = content.filter((i) => i.x >= gutter && !banner.includes(i));
  const sidebarSide = gutter < pageWidth / 2 ? "left" : "right";

  const parts: string[] = [];
  const bannerText = linesOf(banner);
  if (bannerText) parts.push(bannerText);
  const emit = (label: "SIDEBAR" | "MAIN", text: string) => {
    if (text) parts.push(`[${label}]\n${text}`);
  };
  emit(sidebarSide === "left" ? "SIDEBAR" : "MAIN", linesOf(left));
  emit(sidebarSide === "left" ? "MAIN" : "SIDEBAR", linesOf(right));

  return { text: parts.join("\n"), sidebarSide };
}

/* ------------------------------------------------------------------ */

export async function extractResumeText(file: File): Promise<ExtractedResume> {
  if (/\.txt$/i.test(file.name) || file.type === "text/plain") {
    return { text: (await file.text()).trim(), twoColumn: false, sidebarSide: null };
  }

  const pdfjs = await getPdfJs();
  const bytes = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  try {
    const pages: string[] = [];
    let sidebarSide: "left" | "right" | null = null;
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const { width } = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items: PdfTextItem[] = (
        content.items as Array<{ str?: string; transform?: number[]; width?: number }>
      )
        .filter((i) => i.str && i.transform)
        .map((i) => ({
          str: i.str as string,
          x: i.transform![4],
          y: i.transform![5],
          w: i.width ?? 0,
        }));
      const result = layoutPageText(items, width);
      pages.push(result.text);
      sidebarSide ??= result.sidebarSide;
    }
    return {
      text: pages.join("\n\n").trim(),
      twoColumn: sidebarSide !== null,
      sidebarSide,
    };
  } finally {
    void doc.loadingTask.destroy().catch(() => {});
  }
}

/* ------------------------------------------------------------------ */

const str = (v: unknown, max = 2000): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;

function coerceItem(raw: unknown): ResumeItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const bullets = Array.isArray(r.bullets)
    ? r.bullets.filter((b): b is string => typeof b === "string" && b.trim() !== "").map((b) => b.trim())
    : undefined;
  const item: ResumeItem = {
    id: uid(),
    title: str(r.title, 300),
    subtitle: str(r.subtitle, 300),
    date: str(r.date, 80),
    location: str(r.location, 120),
    link: str(r.link, 300),
    description: str(r.description, 4000),
    bullets: bullets && bullets.length ? bullets : undefined,
    levelLabel: str(r.levelLabel, 40),
    level:
      typeof r.level === "number" && Number.isFinite(r.level)
        ? Math.min(5, Math.max(1, Math.round(r.level)))
        : undefined,
    value: typeof r.value === "number" && r.value > 0 ? Math.round(r.value) : undefined,
  };
  const hasContent = item.title || item.subtitle || item.description || item.bullets?.length;
  return hasContent ? item : null;
}

/** Turn the AI's loosely-shaped output into a valid editor document. */
export function normalizeImportedDoc(raw: unknown): ResumeDocument {
  const root = (raw ?? {}) as Record<string, unknown>;
  const basicsRaw = (root.basics ?? {}) as Record<string, unknown>;

  const sections: ResumeSection[] = [];
  for (const s of Array.isArray(root.sections) ? root.sections : []) {
    if (!s || typeof s !== "object") continue;
    const sec = s as Record<string, unknown>;
    const type: SectionType =
      typeof sec.type === "string" && sec.type in SECTION_DEFS ? (sec.type as SectionType) : "custom";
    const def = SECTION_DEFS[type];
    const items = (Array.isArray(sec.items) ? sec.items : [])
      .map(coerceItem)
      .filter((i): i is ResumeItem => i !== null);
    if (!items.length) continue;
    // AI-reported column (from the [SIDEBAR]/[MAIN] markers) preserves the
    // uploaded resume's layout; fall back to the type's usual column.
    const column =
      sec.column === "side" || sec.column === "main" ? sec.column : def.defaultColumn;
    sections.push({
      id: uid(),
      type,
      title: str(sec.title, 80) ?? def.defaultTitle,
      column,
      items,
    });
  }

  if (!sections.length) {
    throw new Error("No resume content could be recognised in this file.");
  }

  return {
    basics: {
      fullName: str(basicsRaw.fullName, 120) ?? "Your Name",
      headline: str(basicsRaw.headline, 160) ?? "",
      email: str(basicsRaw.email, 160) ?? "",
      phone: str(basicsRaw.phone, 40) ?? "",
      location: str(basicsRaw.location, 120) ?? "",
      website: str(basicsRaw.website, 200) ?? "",
    },
    sections,
    settings: { fontScale: 1 },
  };
}

/**
 * Template whose layout most resembles the uploaded resume: a sidebar layout
 * on the matching side for two-column uploads, a plain single column
 * otherwise. Colors remain one click away in the template picker.
 */
export function templateForLayout(extracted: ExtractedResume): string {
  if (!extracted.twoColumn) return "minimal";
  return extracted.sidebarSide === "right" ? "slate" : "forest";
}
