/**
 * "Upload your resume" import pipeline (client side).
 *
 * 1. extractResumeText — pull plain text out of the uploaded PDF/TXT in the
 *    browser (pdf.js is already bundled for the PDF editor tool).
 * 2. The text goes to POST /v1/resume/ai/import, where Gemini buckets it into
 *    a document-shaped JSON.
 * 3. normalizeImportedDoc — coerce that AI output into a strictly valid
 *    ResumeDocument (ids, columns, known section types, clamped levels), so
 *    the editor never sees malformed data.
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

export async function extractResumeText(file: File): Promise<string> {
  if (/\.txt$/i.test(file.name) || file.type === "text/plain") {
    return (await file.text()).trim();
  }

  const pdfjs = await getPdfJs();
  const bytes = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  try {
    const pages: string[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const text = (content.items as Array<{ str?: string; hasEOL?: boolean }>)
        .map((item) => (item.str ?? "") + (item.hasEOL ? "\n" : " "))
        .join("");
      pages.push(text);
    }
    return pages.join("\n\n").replace(/[ \t]+/g, " ").trim();
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
    sections.push({
      id: uid(),
      type,
      title: str(sec.title, 80) ?? def.defaultTitle,
      column: def.defaultColumn,
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
