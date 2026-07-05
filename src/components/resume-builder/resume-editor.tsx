"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { resumeApi, resumeQueryKeys } from "@/src/api/api";
import {
  createSection,
  starterResume,
  type ResumeDocument,
  type SectionType,
} from "@/src/lib/resume";
import { getTemplate } from "@/src/lib/resume-templates";
import { ResumeCanvas, type AiTarget } from "@/src/components/resume-builder/resume-canvas";
import { SectionModal } from "@/src/components/resume-builder/section-modal";
import { TemplateModal } from "@/src/components/resume-builder/template-modal";
import { AiEnhanceDialog } from "@/src/components/resume-builder/ai-popover";
import { AtsPanel } from "@/src/components/resume-builder/ats-panel";
import { SpinnerIcon } from "@/src/components/icons";

/** Coerce whatever the server stored into a usable document. */
function normalizeDoc(raw: unknown): ResumeDocument {
  const doc = raw as ResumeDocument | null;
  if (!doc || typeof doc !== "object" || !Array.isArray(doc.sections) || !doc.basics) {
    return starterResume();
  }
  return { ...doc, settings: doc.settings ?? { fontScale: 1 } };
}

export function ResumeEditor({ resumeId }: { resumeId: number }) {
  const { data: resume, isLoading, isError } = useQuery({
    queryKey: resumeQueryKeys.resume(resumeId),
    queryFn: () => resumeApi.get(resumeId),
    refetchOnWindowFocus: false,
  });

  const [doc, setDoc] = useState<ResumeDocument | null>(null);
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("aurora");
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving">("saved");
  const [pageCount, setPageCount] = useState(1);

  const [sectionModal, setSectionModal] = useState(false);
  const [templateModal, setTemplateModal] = useState(false);
  const [atsOpen, setAtsOpen] = useState(false);
  const [aiTarget, setAiTarget] = useState<AiTarget | null>(null);

  // Hydrate local state once per fetched resume.
  const hydratedFor = useRef<number | null>(null);
  useEffect(() => {
    if (resume && hydratedFor.current !== resume.resumeId) {
      hydratedFor.current = resume.resumeId;
      setDoc(normalizeDoc(resume.data));
      setTitle(resume.title);
      setTemplateId(resume.template);
    }
  }, [resume]);

  const save = useMutation({
    mutationFn: (body: { title?: string; template?: string; data?: unknown }) =>
      resumeApi.update(resumeId, body),
    onMutate: () => setSaveState("saving"),
    onSuccess: () => setSaveState("saved"),
    onError: () => setSaveState("dirty"),
  });
  const saveRef = useRef(save.mutate);
  useEffect(() => {
    saveRef.current = save.mutate;
  }, [save.mutate]);

  // Debounced autosave whenever the document / title / template change.
  const skipFirst = useRef(true);
  useEffect(() => {
    if (!doc) return;
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }
    setSaveState("dirty");
    const t = setTimeout(() => {
      saveRef.current({ title, template: templateId, data: doc });
    }, 1200);
    return () => clearTimeout(t);
  }, [doc, title, templateId]);

  const updateDoc = useCallback(
    (mutate: (d: ResumeDocument) => ResumeDocument) =>
      setDoc((d) => (d ? mutate(d) : d)),
    [],
  );

  const addSection = (type: SectionType) => {
    updateDoc((d) => ({ ...d, sections: [...d.sections, createSection(type)] }));
    setSectionModal(false);
  };

  const removeSectionType = (type: SectionType) => {
    updateDoc((d) => {
      const idx = d.sections.findIndex((s) => s.type === type);
      if (idx === -1) return d;
      return { ...d, sections: d.sections.filter((_, i) => i !== idx) };
    });
  };

  const applyAi = (target: AiTarget, newText: string) => {
    updateDoc((d) => ({
      ...d,
      sections: d.sections.map((s) =>
        s.id !== target.sectionId
          ? s
          : {
              ...s,
              items: s.items.map((i) =>
                i.id !== target.itemId
                  ? i
                  : target.usesBullets
                    ? { ...i, bullets: newText.split("\n").map((b) => b.replace(/^[-•]\s*/, "").trim()).filter(Boolean) }
                    : { ...i, description: newText },
              ),
            },
      ),
    }));
    setAiTarget(null);
  };

  if (isLoading || !doc) {
    return (
      <div className="flex h-64 items-center justify-center">
        {isError ? (
          <p className="text-sm text-danger">Could not load this resume.</p>
        ) : (
          <SpinnerIcon className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
      </div>
    );
  }

  const template = getTemplate(templateId);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="sticky top-2 z-30 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm print:hidden">
        <Link
          href="/dashboard/tools/resume-builder"
          className="rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          ← Back
        </Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Resume title"
          className="w-48 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-semibold text-foreground outline-none transition focus:border-input focus:bg-background"
        />
        <span className="text-xs text-muted-foreground">
          {saveState === "saving" ? "Saving…" : saveState === "dirty" ? "Unsaved changes" : "Saved"}
        </span>
        <span
          className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          title="Content flows onto a new A4 page automatically when a page fills up"
        >
          A4 · {pageCount} page{pageCount === 1 ? "" : "s"}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTemplateModal(true)}
            className="rounded-lg border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            🎨 {template.name}
          </button>
          <button
            onClick={() => setSectionModal(true)}
            className="rounded-lg border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            + Add section
          </button>
          <button
            onClick={() => setAtsOpen(true)}
            className="rounded-lg border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            ATS check
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Download PDF
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground print:hidden">
        Click any text on the page to edit it in place · hover a section for move / sidebar / remove
        controls · ✨ appears on hover next to paragraphs and bullet groups.
      </p>

      {/* Canvas (scrolls horizontally on small screens) */}
      <div className="overflow-x-auto pb-10">
        <ResumeCanvas
          doc={doc}
          template={template}
          editable
          onChange={updateDoc}
          onAiRequest={setAiTarget}
          onPageCount={setPageCount}
        />
      </div>

      {sectionModal && (
        <SectionModal
          doc={doc}
          onAdd={addSection}
          onRemove={removeSectionType}
          onClose={() => setSectionModal(false)}
        />
      )}
      {templateModal && (
        <TemplateModal
          current={templateId}
          onSelect={(id) => {
            setTemplateId(id);
            setTemplateModal(false);
          }}
          onClose={() => setTemplateModal(false)}
        />
      )}
      {aiTarget && (
        <AiEnhanceDialog target={aiTarget} onApply={applyAi} onClose={() => setAiTarget(null)} />
      )}
      {atsOpen && <AtsPanel resumeId={resumeId} onClose={() => setAtsOpen(false)} />}
    </div>
  );
}
