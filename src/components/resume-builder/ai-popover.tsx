"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { resumeApi, type ResumeAiMode } from "@/src/api/api";
import { CloseIcon, SpinnerIcon } from "@/src/components/icons";
import type { AiTarget } from "@/src/components/resume-builder/resume-canvas";

const MODES: { id: ResumeAiMode; label: string }[] = [
  { id: "improve", label: "Improve" },
  { id: "shorten", label: "Shorten" },
  { id: "expand", label: "Expand" },
  { id: "grammar", label: "Fix grammar" },
  { id: "keywords", label: "ATS keywords" },
];

/** Centered dialog: pick a rewrite mode, preview the AI result, apply it. */
export function AiEnhanceDialog({
  target,
  onApply,
  onClose,
}: {
  target: AiTarget;
  onApply: (target: AiTarget, newText: string) => void;
  onClose: () => void;
}) {
  const [result, setResult] = useState<string | null>(null);
  const [mode, setMode] = useState<ResumeAiMode>("improve");

  const enhance = useMutation({
    mutationFn: (m: ResumeAiMode) =>
      resumeApi.enhance({ text: target.text, mode: m, context: target.context }),
    onSuccess: (res) => setResult(res.text),
  });

  const run = (m: ResumeAiMode) => {
    setMode(m);
    setResult(null);
    enhance.mutate(m);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">✨ AI writing assistant</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{target.context}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => run(m.id)}
              disabled={enhance.isPending}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
                mode === m.id && (result !== null || enhance.isPending)
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-input text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Original
          </p>
          <p className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">
            {target.text}
          </p>
        </div>

        <div className="mt-2 min-h-[88px] rounded-xl border border-primary/30 bg-accent/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
            AI suggestion
          </p>
          {enhance.isPending ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <SpinnerIcon className="h-4 w-4 animate-spin" /> Rewriting…
            </div>
          ) : enhance.isError ? (
            <p className="mt-1 text-sm text-danger">
              {(enhance.error as Error)?.message || "AI request failed — try again."}
            </p>
          ) : result !== null ? (
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{result}</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a mode above to generate a rewrite.
            </p>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-input px-3.5 py-1.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            Cancel
          </button>
          <button
            disabled={!result}
            onClick={() => result && onApply(target, result)}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
