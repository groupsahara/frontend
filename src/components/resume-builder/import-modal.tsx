"use client";

import { useRef, useState } from "react";
import { resumeApi } from "@/src/api/api";
import {
  MAX_IMPORT_BYTES,
  extractResumeText,
  normalizeImportedDoc,
  templateForLayout,
} from "@/src/lib/resume-import";
import type { ResumeDocument } from "@/src/lib/resume";
import { CloseIcon, SpinnerIcon } from "@/src/components/icons";

type Step = "idle" | "extracting" | "structuring" | "creating";

const STEP_LABELS: Record<Exclude<Step, "idle">, string> = {
  extracting: "Reading your file…",
  structuring: "AI is structuring your resume…",
  creating: "Creating your editable resume…",
};

/**
 * "Upload your resume" — the user's existing PDF/TXT resume becomes a fully
 * editable document: text is extracted in the browser, AI-structured on the
 * server, normalized, then saved as a new resume that opens in the editor.
 */
export function ImportResumeModal({
  onCreated,
  onClose,
}: {
  onCreated: (resumeId: number) => void;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const busy = step !== "idle";

  const handleFile = async (file: File) => {
    setError(null);
    const supported = /\.(pdf|txt)$/i.test(file.name) || ["application/pdf", "text/plain"].includes(file.type);
    if (!supported) {
      setError("Upload a PDF or plain-text (.txt) resume. For Word files, save as PDF first.");
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      setError("File is larger than 20 MB.");
      return;
    }

    try {
      setStep("extracting");
      const extracted = await extractResumeText(file);
      if (extracted.text.length < 80) {
        throw new Error(
          "Couldn't find readable text in this file — scanned/image PDFs are not supported yet.",
        );
      }

      setStep("structuring");
      const structured = await resumeApi.import({ text: extracted.text.slice(0, 40000) });
      const doc: ResumeDocument = normalizeImportedDoc(structured);

      setStep("creating");
      const title =
        doc.basics.fullName && doc.basics.fullName !== "Your Name"
          ? `${doc.basics.fullName} — imported`
          : file.name.replace(/\.(pdf|txt)$/i, "");
      const created = await resumeApi.create({
        title,
        template: templateForLayout(extracted),
        data: doc,
      });
      onCreated(created.resumeId);
    } catch (err) {
      setStep("idle");
      setError((err as Error)?.message || "Import failed — please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Upload your resume</h3>
          <button
            onClick={onClose}
            disabled={busy}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Your existing resume is converted into a fully editable document — then every tool here
          (templates, sections, AI enhance, ATS check) works on it.
        </p>

        {busy ? (
          <div className="mt-5 flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-10">
            <SpinnerIcon className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">{STEP_LABELS[step]}</p>
            <p className="text-xs text-muted-foreground">This usually takes a few seconds.</p>
          </div>
        ) : (
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
            className={`mt-5 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
              dragOver ? "border-primary bg-accent" : "border-border hover:border-primary/60"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf,text/plain,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
            <p className="text-sm font-semibold text-foreground">Drop your resume here or click to browse</p>
            <p className="text-xs text-muted-foreground">PDF or TXT · up to 20 MB</p>
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
