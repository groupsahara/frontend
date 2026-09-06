"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  crmCampaignsApi,
  crmQueryKeys,
  type WhatsappTemplate,
} from "@/src/api/api";
import { Badge, Field, inputCls, Notice } from "@/src/components/crm/ui";

export type TemplateChoice = {
  name: string;
  language: string;
  params: string[];
};

export const templateKey = (t: { name: string; language: string }) =>
  `${t.name}|${t.language}`;

/**
 * Seed the variable boxes. {{1}} is the greeting in every template we use, so
 * it gets the recipient's own name; the rest start from Meta's example values
 * so an admin edits real text rather than filling blanks.
 */
export const defaultParams = (t: WhatsappTemplate): string[] =>
  Array.from({ length: t.variableCount }, (_, i) =>
    i === 0 ? "{{name}}" : (t.example[i] ?? ""),
  );

/** The message as the recipient will read it, with {{n}} filled in. */
export const renderTemplate = (
  body: string,
  params: string[],
  name: string | null,
) =>
  body.replace(/\{\{(\d+)\}\}/g, (_, n: string) => {
    const v = params[Number(n) - 1] ?? "";
    return v === "{{name}}" ? (name ?? "there") : v || `{{${n}}}`;
  });

/**
 * Pick an approved template, fill its variables, and see the result — shared by
 * the campaign builder and the single-customer send so the two can never drift
 * apart on what a template send looks like.
 *
 * Templates are read from Meta on every mount rather than cached: Meta pauses
 * or disables them for quality at any time, and a stale list would offer a
 * choice that silently fails.
 */
export function TemplateComposer({
  value,
  onChange,
  previewName,
  previewTo,
  allowNone = false,
}: {
  value: TemplateChoice;
  onChange: (v: TemplateChoice) => void;
  /** Stands in for {{name}} in the preview. */
  previewName: string | null;
  /** Shown beside the preview, e.g. the number or the audience size. */
  previewTo?: string;
  /** Offer a "no template" option — campaigns may fall back to free-form text. */
  allowNone?: boolean;
}) {
  const templates = useQuery({
    queryKey: crmQueryKeys.whatsappTemplates,
    queryFn: () => crmCampaignsApi.templates(),
    retry: false,
  });

  const usable = useMemo(
    () => (templates.data ?? []).filter((t) => t.status === "APPROVED"),
    [templates.data],
  );

  const picked = value.name ? `${value.name}|${value.language}` : "";
  const template = usable.find((t) => templateKey(t) === picked);

  // Templates arrive after mount, so the first render has nothing selected.
  // A <select> with no matching option still DISPLAYS its first one, so the
  // modal looked like weekend_offer was chosen while the state was empty —
  // no variables, no preview, until the admin switched templates and back.
  // Adopt the first approved template as soon as the list lands.
  //
  // Not done when "no template" is offered: there, an empty value is a real
  // choice the select shows correctly, and defaulting would silently arm a
  // marketing template on a campaign meant to go out as free-form text.
  useEffect(() => {
    if (allowNone || value.name || !usable.length) return;
    const first = usable[0];
    onChange({
      name: first.name,
      language: first.language,
      params: defaultParams(first),
    });
  }, [usable, value.name, allowNone, onChange]);

  const pick = (key: string) => {
    if (!key) return onChange({ name: "", language: "", params: [] });
    const t = usable.find((x) => templateKey(x) === key);
    if (!t) return;
    onChange({ name: t.name, language: t.language, params: defaultParams(t) });
  };

  const setParamAt = (i: number, v: string) =>
    onChange({
      ...value,
      params: value.params.map((p, n) => (n === i ? v : p)),
    });

  const preview = template
    ? renderTemplate(template.body, value.params, previewName)
    : "";

  return (
    <div className="space-y-4">
      {templates.isError && (
        <Notice kind="error">
          Could not read templates from Meta. Check the WhatsApp credentials in
          the backend.
        </Notice>
      )}

      <Field
        label="Template"
        hint="Only templates Meta has approved can be delivered"
      >
        <select
          className={inputCls}
          value={picked}
          onChange={(e) => pick(e.target.value)}
          disabled={templates.isLoading}
        >
          {allowNone && (
            <option value="">No template — send free-form text</option>
          )}
          {templates.isLoading && <option value="">Loading templates…</option>}
          {!templates.isLoading && !usable.length && !allowNone && (
            <option value="">No approved templates</option>
          )}
          {usable.map((t) => (
            <option key={templateKey(t)} value={templateKey(t)}>
              {t.name} ({t.language}) · {t.category}
            </option>
          ))}
        </select>
      </Field>

      {template && template.variableCount > 0 && (
        <Field
          label="Variables"
          hint="{{name}} is replaced per recipient; everything else sends as written"
        >
          <div className="space-y-2">
            {value.params.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-xs text-muted-foreground">{`{{${i + 1}}}`}</span>
                <input
                  className={inputCls}
                  value={p}
                  onChange={(e) => setParamAt(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </Field>
      )}

      {template && (
        <div className="rounded-xl border border-border bg-accent/20 px-4 py-3">
          <div className="mb-1 flex items-center gap-2">
            <p className="text-xs text-muted-foreground">Preview</p>
            {previewTo && <Badge tone="muted">{previewTo}</Badge>}
          </div>
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {preview}
          </p>
        </div>
      )}
    </div>
  );
}
