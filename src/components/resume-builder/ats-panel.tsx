"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { resumeApi, type AtsReport } from "@/src/api/api";
import { CloseIcon, SpinnerIcon } from "@/src/components/icons";

/**
 * ATS report drawer. The score ring is a single-value stat: the ring wears a
 * status color by band, but the band is always ALSO stated in text (label +
 * number in ink) so state is never color-alone.
 */
export function AtsPanel({ resumeId, onClose }: { resumeId: number; onClose: () => void }) {
  const [targetRole, setTargetRole] = useState("");
  const [report, setReport] = useState<AtsReport | null>(null);

  const run = useMutation({
    mutationFn: () => resumeApi.ats(resumeId, targetRole.trim() || undefined),
    onSuccess: setReport,
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">ATS check</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Target role (optional — sharpens keyword suggestions)
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && run.mutate()}
                placeholder="e.g. Senior Backend Engineer"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => run.mutate()}
                disabled={run.isPending}
                className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {run.isPending && <SpinnerIcon className="h-4 w-4 animate-spin" />}
                {report ? "Re-check" : "Run check"}
              </button>
            </div>
          </div>

          {run.isError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {(run.error as Error)?.message || "ATS check failed."}
            </p>
          )}

          {report && (
            <>
              <ScoreRing score={report.score} wordCount={report.wordCount} />

              <div>
                <h4 className="text-sm font-semibold text-foreground">Checks</h4>
                <ul className="mt-2 space-y-2">
                  {report.checks.map((c) => (
                    <li key={c.id} className="flex items-start gap-2.5 rounded-lg border border-border px-3 py-2">
                      <span
                        aria-hidden
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                          c.passed ? "bg-success" : "bg-danger"
                        }`}
                      >
                        {c.passed ? "✓" : "✕"}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {c.label}
                          <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                            {c.passed ? "passed" : "failed"} · {c.weight} pts
                          </span>
                        </p>
                        {!c.passed && <p className="text-xs text-muted-foreground">{c.tip}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {report.aiSuggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground">✨ AI suggestions</h4>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5">
                    {report.aiSuggestions.map((s, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.missingKeywords.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground">
                    Missing keywords{report.targetRole ? ` for “${report.targetRole}”` : ""}
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {report.missingKeywords.map((k) => (
                      <span
                        key={k}
                        className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!report.aiAvailable && (
                <p className="text-xs text-muted-foreground">
                  AI suggestions were unavailable — the score above is from rule-based checks only.
                </p>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function ScoreRing({ score, wordCount }: { score: number; wordCount: number }) {
  const band =
    score >= 80
      ? { label: "Excellent", cls: "text-success", stroke: "var(--success)" }
      : score >= 60
        ? { label: "Good — room to improve", cls: "text-warning", stroke: "var(--warning)" }
        : { label: "Needs work", cls: "text-danger", stroke: "var(--danger)" };

  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div className="flex items-center gap-5 rounded-xl border border-border bg-muted/30 p-4">
      <svg width={128} height={128} viewBox="0 0 128 128" role="img" aria-label={`ATS score ${score} out of 100`}>
        <circle cx={64} cy={64} r={R} fill="none" stroke="var(--border)" strokeWidth={10} />
        <circle
          cx={64}
          cy={64}
          r={R}
          fill="none"
          stroke={band.stroke}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * C} ${C}`}
          transform="rotate(-90 64 64)"
        />
        <text x={64} y={60} textAnchor="middle" className="fill-foreground" fontSize={30} fontWeight={700}>
          {score}
        </text>
        <text x={64} y={80} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
          / 100
        </text>
      </svg>
      <div>
        <p className={`text-sm font-semibold ${band.cls}`}>{band.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {wordCount} words · scored against 11 ATS rules. Re-run after edits to track progress.
        </p>
      </div>
    </div>
  );
}
