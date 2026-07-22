"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  MAX_PDF_BYTES,
  downloadBytes,
  exportEditedPdf,
  loadPdfDocument,
  type PdfEdit,
} from "@/src/lib/pdf-editor";
import { PdfPageView } from "@/src/components/pdf-editor/pdf-page";
import { CloseIcon, PencilIcon, SpinnerIcon } from "@/src/components/icons";

type LoadedDoc = {
  name: string;
  sizeLabel: string;
  doc: PDFDocumentProxy;
  numPages: number;
  baseScale: number; // fit-to-width scale for zoom = 100 %
};

const ZOOM_STEPS = [0.5, 0.65, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3];

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function PdfEditor() {
  const bytesRef = useRef<ArrayBuffer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loaded, setLoaded] = useState<LoadedDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [edits, setEdits] = useState<Map<string, PdfEdit>>(new Map());
  const [exporting, setExporting] = useState(false);

  // Free pdf.js worker resources when the tool unmounts or a new file replaces the old one.
  useEffect(() => {
    return () => {
      loaded?.doc.loadingTask.destroy().catch(() => {});
    };
  }, [loaded]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      setError("Only PDF files are supported.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError(`"${file.name}" is ${formatSize(file.size)} — the limit is 20 MB.`);
      return;
    }

    setLoading(true);
    try {
      const bytes = await file.arrayBuffer();
      const doc = await loadPdfDocument(bytes);
      const firstPage = await doc.getPage(1);
      const { width } = firstPage.getViewport({ scale: 1 });
      bytesRef.current = bytes;
      setLoaded({
        name: file.name,
        sizeLabel: formatSize(file.size),
        doc,
        numPages: doc.numPages,
        baseScale: Math.min(1.6, 860 / width),
      });
      setEdits(new Map());
      setEditMode(false);
      setZoom(1);
    } catch (err) {
      console.error("Failed to open PDF", err);
      setError("Could not open this PDF. It may be corrupted or password-protected.");
    } finally {
      setLoading(false);
    }
  }, []);

  const closeFile = () => {
    bytesRef.current = null;
    setLoaded(null);
    setEdits(new Map());
    setEditMode(false);
    setError(null);
  };

  const applyEdit = (edit: PdfEdit) =>
    setEdits((prev) => {
      const next = new Map(prev);
      next.set(edit.key, edit);
      return next;
    });

  const removeEdit = (key: string) =>
    setEdits((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });

  const stepZoom = (dir: 1 | -1) =>
    setZoom((z) => {
      const idx = ZOOM_STEPS.findIndex((s) => Math.abs(s - z) < 0.01);
      const next = idx === -1 ? (dir === 1 ? 1.25 : 0.8) : ZOOM_STEPS[idx + dir];
      return next ?? z;
    });

  const handleDownload = async () => {
    if (!bytesRef.current || !loaded || exporting) return;
    setExporting(true);
    setError(null);
    try {
      const out = await exportEditedPdf(bytesRef.current, Array.from(edits.values()));
      downloadBytes(out, loaded.name.replace(/\.pdf$/i, "") + "-edited.pdf");
    } catch (err) {
      console.error("PDF export failed", err);
      setError("Export failed — one of the edits could not be written into the PDF.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">PDF Editor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a PDF, switch on edit mode and click any text to replace it. The original font
            family and size are detected automatically, and the background stays untouched.
          </p>
        </div>
        {loaded && (
          <div className="flex items-center gap-2 text-sm">
            <span className="max-w-[260px] truncate rounded-lg bg-muted px-3 py-1.5 text-muted-foreground" title={loaded.name}>
              {loaded.name} · {loaded.sizeLabel} · {loaded.numPages} page{loaded.numPages === 1 ? "" : "s"}
            </span>
            <button
              onClick={closeFile}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="Close file"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {!loaded ? (
        /* ---------- Upload state ---------- */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={[
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-20 text-center transition",
            dragOver ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/60",
          ].join(" ")}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          {loading ? (
            <>
              <SpinnerIcon className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Opening PDF…</p>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <PencilIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">
                  Drop a PDF here or click to browse
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  PDF only · up to 20 MB · processed entirely in your browser
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        /* ---------- Editor state ---------- */
        <>
          {/* Toolbar */}
          <div className="sticky top-2 z-30 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm">
            <button
              onClick={() => setEditMode((v) => !v)}
              className={[
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition",
                editMode
                  ? "bg-primary text-primary-foreground"
                  : "border border-input text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <PencilIcon className="h-4 w-4" />
              {editMode ? "Edit mode: ON" : "Enable edit mode"}
            </button>

            {edits.size > 0 && (
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                {edits.size} edit{edits.size === 1 ? "" : "s"}
              </span>
            )}
            {edits.size > 0 && (
              <button
                onClick={() => setEdits(new Map())}
                className="text-xs font-medium text-danger hover:underline"
              >
                Clear all
              </button>
            )}

            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => stepZoom(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-input text-muted-foreground transition hover:text-foreground"
                title="Zoom out"
              >
                −
              </button>
              <button
                onClick={() => setZoom(1)}
                className="w-14 text-center text-sm tabular-nums text-muted-foreground transition hover:text-foreground"
                title="Reset zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={() => stepZoom(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-input text-muted-foreground transition hover:text-foreground"
                title="Zoom in"
              >
                +
              </button>
            </div>

            <button
              onClick={handleDownload}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {exporting && <SpinnerIcon className="h-4 w-4 animate-spin" />}
              {exporting ? "Exporting…" : "Download PDF"}
            </button>
          </div>

          {editMode && (
            <div className="rounded-xl border border-primary/30 bg-accent px-4 py-2.5 text-sm text-accent-foreground">
              Click any text to edit it (fonts, size, slant pre-matched) — or drag a box over
              ANY area, even logos and image text: AI reads it so you can replace or erase it.
              Use “Blend (old doc)” on scanned documents to keep the aged look.
            </div>
          )}

          {/* Pages */}
          <div className="flex flex-col items-center gap-6 overflow-x-auto pb-8">
            {Array.from({ length: loaded.numPages }, (_, i) => (
              <PdfPageView
                key={i}
                doc={loaded.doc}
                pageIndex={i}
                scale={loaded.baseScale * zoom}
                editMode={editMode}
                edits={Array.from(edits.values()).filter((e) => e.pageIndex === i)}
                onApply={applyEdit}
                onRemove={removeEdit}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
