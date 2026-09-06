"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/src/api/apiClient";
import {
  crmCampaignsApi,
  crmQueryKeys,
  type TemplateButton,
  type WhatsappTemplate,
} from "@/src/api/api";
import {
  Badge,
  Btn,
  Card,
  EmptyRow,
  Field,
  inputCls,
  Modal,
  Notice,
  PageHeader,
  TableShell,
} from "@/src/components/crm/ui";
import { PlusIcon, TrashIcon } from "@/src/components/icons";
import { hasPermission } from "@/src/lib/auth";

const CATEGORIES = [
  {
    key: "MARKETING",
    hint: "Offers and promotions. Recipients can mute these, and Meta caps how many they receive.",
  },
  {
    key: "UTILITY",
    hint: "About something the customer already did — a booking, an order, a payment.",
  },
  { key: "AUTHENTICATION", hint: "One-time passcodes only." },
];

const statusTone: Record<string, string> = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "danger",
  PAUSED: "danger",
  DISABLED: "danger",
};

/** Meta numbers variables from 1; find how many the body actually uses. */
const variablesIn = (body: string) => {
  const found = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
  return found.length ? Math.max(...found) : 0;
};

export default function WhatsappTemplatesPage() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<WhatsappTemplate | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage = hasPermission("campaigns.templates");

  const { data, isLoading, error } = useQuery({
    queryKey: crmQueryKeys.whatsappTemplates,
    queryFn: () => crmCampaignsApi.templates(),
    retry: false,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: crmQueryKeys.whatsappTemplates });

  const del = useMutation({
    mutationFn: (name: string) => crmCampaignsApi.deleteTemplate(name),
    onSuccess: () => {
      setConfirmDelete(null);
      setActionError(null);
      setNotice("Template deleted.");
      invalidate();
    },
    onError: (e) => {
      setConfirmDelete(null);
      setActionError(
        e instanceof ApiError ? e.message : "Could not delete the template.",
      );
    },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="WhatsApp Templates"
        subtitle="Marketing can only be sent as a template Meta has reviewed and approved"
        action={
          canManage ? (
            <Btn
              onClick={() => {
                setNotice(null);
                setActionError(null);
                setAdding(true);
              }}
            >
              <PlusIcon className="h-4 w-4" />
              New template
            </Btn>
          ) : undefined
        }
      />

      {error instanceof ApiError && (
        <Notice kind="error">{error.message}</Notice>
      )}
      {actionError && <Notice kind="error">{actionError}</Notice>}
      {notice && <Notice kind="success">{notice}</Notice>}

      <Card>
        <TableShell
          head={[
            "Name",
            "Category",
            "Language",
            "Status",
            "Message",
            "Vars",
            "",
          ]}
        >
          {isLoading && (
            <EmptyRow cols={7} label="Reading templates from Meta…" />
          )}
          {!isLoading && !data?.length && (
            <EmptyRow
              cols={7}
              label="No templates yet — create one and Meta will review it."
            />
          )}
          {data?.map((t) => (
            <tr
              key={`${t.name}|${t.language}`}
              className="align-top text-foreground"
            >
              <td className="px-4 py-3 font-medium">{t.name}</td>
              <td className="px-4 py-3">
                <Badge tone={t.category === "MARKETING" ? "primary" : "muted"}>
                  {t.category}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{t.language}</td>
              <td className="px-4 py-3">
                <Badge tone={statusTone[t.status] ?? "muted"}>{t.status}</Badge>
              </td>
              <td className="max-w-md px-4 py-3 text-xs text-muted-foreground">
                <span className="whitespace-pre-wrap">{t.body}</span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {t.variableCount || "—"}
              </td>
              <td className="px-4 py-3">
                {canManage && (
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-danger transition-colors hover:bg-danger/10"
                    onClick={() => setConfirmDelete(t)}
                    title="Delete template"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </TableShell>
      </Card>

      {adding && (
        <NewTemplateModal
          onClose={() => setAdding(false)}
          onCreated={(name, status) => {
            setAdding(false);
            setActionError(null);
            setNotice(
              `“${name}” submitted — Meta says ${status}. Approval usually takes a few minutes; it appears in campaign dropdowns once APPROVED.`,
            );
            invalidate();
          }}
        />
      )}

      {confirmDelete && (
        <Modal
          title="Delete this template?"
          onClose={() => setConfirmDelete(null)}
        >
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{confirmDelete.name}</strong>{" "}
            will be removed from Meta, in every language. Campaigns that still
            name it will start failing, and the name cannot be reused
            immediately.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Btn
              tone="ghost"
              onClick={() => setConfirmDelete(null)}
              disabled={del.isPending}
            >
              Cancel
            </Btn>
            <Btn
              tone="danger"
              busy={del.isPending}
              onClick={() => del.mutate(confirmDelete.name)}
            >
              Delete template
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* --------------------------- Create modal ------------------------------ */

function NewTemplateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (name: string, status: string) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [language, setLanguage] = useState("en");
  const [header, setHeader] = useState("");
  const [headerExample, setHeaderExample] = useState("");
  const [body, setBody] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const headerRef = useRef<HTMLInputElement>(null);
  const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState<TemplateButton[]>([]);
  const [examples, setExamples] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Meta requires one sample per {{n}}. The count follows the body as it is
  // typed, so the example boxes appear and disappear with the placeholders.
  const varCount = useMemo(() => variablesIn(body), [body]);
  const headerHasVar = /\{\{\d+\}\}/.test(header);

  /**
   * Insert the next {{n}} at the cursor, the way Meta's own editor does.
   * Typing placeholders by hand is where numbering goes wrong — skip a number
   * or repeat one and Meta rejects the whole template.
   */
  const setButtonAt = (i: number, patch: Partial<TemplateButton>) =>
    setButtons((prev) =>
      prev.map((b, n) => (n === i ? { ...b, ...patch } : b)),
    );

  const insertBodyVariable = () => {
    const el = bodyRef.current;
    const token = `{{${varCount + 1}}}`;
    if (!el) return setBody((b) => b + token);
    const at = el.selectionStart ?? body.length;
    setBody(body.slice(0, at) + token + body.slice(el.selectionEnd ?? at));
    // Put the caret after what was just inserted.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(at + token.length, at + token.length);
    });
  };

  // A header may hold exactly one variable, and it is always {{1}} — its
  // numbering is independent of the body's.
  const insertHeaderVariable = () => {
    if (headerHasVar) return;
    const el = headerRef.current;
    const at = el?.selectionStart ?? header.length;
    setHeader(
      header.slice(0, at) + "{{1}}" + header.slice(el?.selectionEnd ?? at),
    );
    requestAnimationFrame(() => el?.focus());
  };
  const filledExamples = useMemo(
    () => Array.from({ length: varCount }, (_, i) => examples[i] ?? ""),
    [varCount, examples],
  );

  const preview = useMemo(
    () =>
      body.replace(
        /\{\{(\d+)\}\}/g,
        (_, n: string) => filledExamples[Number(n) - 1] || `{{${n}}}`,
      ),
    [body, filledExamples],
  );

  const create = useMutation({
    mutationFn: () =>
      crmCampaignsApi.createTemplate({
        name: name.trim(),
        category,
        language: language.trim(),
        body: body.trim(),
        bodyExamples: filledExamples,
        header: header.trim() || undefined,
        headerExample: headerHasVar
          ? headerExample.trim() || undefined
          : undefined,
        footer: footer.trim() || undefined,
        buttons: buttons.length ? buttons : undefined,
      }),
    onSuccess: (r) => onCreated(name.trim(), r.status),
    onError: (e) =>
      setError(
        e instanceof ApiError ? e.message : "Meta rejected the template.",
      ),
  });

  const categoryHint = CATEGORIES.find((c) => c.key === category)?.hint;

  return (
    <Modal title="New WhatsApp template" onClose={onClose} wide>
      <div className="space-y-4">
        {error && <Notice kind="error">{error}</Notice>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Name *" hint="lowercase, digits and _ only">
            <input
              className={inputCls}
              value={name}
              onChange={(e) =>
                setName(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                )
              }
              placeholder="diwali_offer"
            />
          </Field>
          <Field label="Category *" hint={categoryHint}>
            <select
              className={inputCls}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.key}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Language *" hint="e.g. en, en_US, hi">
            <input
              className={inputCls}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="en"
            />
          </Field>
        </div>

        <Field
          label="Header"
          hint="Optional bold line at the top of the message"
        >
          <div className="space-y-2">
            <input
              ref={headerRef}
              className={inputCls}
              value={header}
              maxLength={60}
              onChange={(e) => setHeader(e.target.value)}
              placeholder="Diwali offer"
            />
            <div className="flex items-center justify-between">
              <Btn
                tone="ghost"
                small
                onClick={insertHeaderVariable}
                disabled={headerHasVar}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add variable
              </Btn>
              <span className="text-xs text-muted-foreground">
                {header.length}/60
              </span>
            </div>
            {headerHasVar && (
              <input
                className={inputCls}
                value={headerExample}
                onChange={(e) => setHeaderExample(e.target.value)}
                placeholder="Sample for the header variable, e.g. Diwali"
              />
            )}
          </div>
        </Field>

        <Field
          label="Message *"
          hint="Use {{1}}, {{2}} … for anything that changes per customer, numbered in order"
        >
          <div className="space-y-2">
            <textarea
              ref={bodyRef}
              className={`${inputCls} min-h-32`}
              value={body}
              maxLength={1024}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                "Hi {{1}},\n\nGet {{2}} OFF your next booking. Use code {{3}} before {{4}}."
              }
            />
            <div className="flex items-center justify-between">
              <Btn tone="ghost" small onClick={insertBodyVariable}>
                <PlusIcon className="h-3.5 w-3.5" />
                Add variable
              </Btn>
              <span className="text-xs text-muted-foreground">
                {body.length}/1024
              </span>
            </div>
          </div>
        </Field>

        {varCount > 0 && (
          <Field
            label="Example values *"
            hint="Meta reviews the template with these filled in and rejects it outright if any is blank"
          >
            <div className="space-y-2">
              {filledExamples.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-xs text-muted-foreground">{`{{${i + 1}}}`}</span>
                  <input
                    className={inputCls}
                    value={v}
                    onChange={(e) =>
                      setExamples((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                    placeholder={i === 0 ? "Prem" : "50%"}
                  />
                </div>
              ))}
            </div>
          </Field>
        )}

        <Field label="Footer" hint="Optional small print under the message">
          <div className="space-y-2">
            <input
              className={inputCls}
              value={footer}
              maxLength={60}
              onChange={(e) => setFooter(e.target.value)}
              placeholder="Reply STOP to opt out"
            />
            <div className="text-right text-xs text-muted-foreground">
              {footer.length}/60
            </div>
          </div>
        </Field>

        <Field
          label="Buttons"
          hint="Up to 3. A link opens a page, a call button dials you, a quick reply sends its own text back."
        >
          <div className="space-y-2">
            {buttons.map((b, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <select
                  className={`${inputCls} w-auto`}
                  value={b.type}
                  onChange={(e) =>
                    setButtonAt(i, {
                      type: e.target.value as TemplateButton["type"],
                    })
                  }
                >
                  <option value="URL">Visit website</option>
                  <option value="PHONE_NUMBER">Call phone number</option>
                  <option value="QUICK_REPLY">Quick reply</option>
                </select>
                <input
                  className={`${inputCls} w-40`}
                  value={b.text}
                  maxLength={25}
                  onChange={(e) => setButtonAt(i, { text: e.target.value })}
                  placeholder="Book now"
                />
                {b.type === "URL" && (
                  <input
                    className={`${inputCls} flex-1`}
                    value={b.url ?? ""}
                    onChange={(e) => setButtonAt(i, { url: e.target.value })}
                    placeholder="https://www.restocare.in/"
                  />
                )}
                {b.type === "PHONE_NUMBER" && (
                  <input
                    className={`${inputCls} flex-1`}
                    value={b.phoneNumber ?? ""}
                    onChange={(e) =>
                      setButtonAt(i, { phoneNumber: e.target.value })
                    }
                    placeholder="+919953532995"
                  />
                )}
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-danger transition-colors hover:bg-danger/10"
                  onClick={() =>
                    setButtons((prev) => prev.filter((_, n) => n !== i))
                  }
                  title="Remove button"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
            {buttons.length < 3 && (
              <Btn
                tone="ghost"
                small
                onClick={() =>
                  setButtons((prev) => [
                    ...prev,
                    { type: "URL", text: "", url: "" },
                  ])
                }
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add button
              </Btn>
            )}
          </div>
        </Field>

        {body.trim() !== "" && (
          <div className="rounded-xl border border-border bg-accent/20 px-4 py-3">
            <p className="mb-1 text-xs text-muted-foreground">Preview</p>
            {header.trim() && (
              <p className="text-sm font-semibold text-foreground">{header}</p>
            )}
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {preview}
            </p>
            {footer.trim() && (
              <p className="mt-2 text-xs text-muted-foreground">{footer}</p>
            )}
            {buttons.filter((b) => b.text.trim()).length > 0 && (
              <div className="mt-3 space-y-1 border-t border-border pt-2">
                {buttons
                  .filter((b) => b.text.trim())
                  .map((b, i) => (
                    <p
                      key={i}
                      className="text-center text-sm font-medium text-primary"
                    >
                      {b.text}
                    </p>
                  ))}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Meta reviews every template. It arrives as PENDING and only becomes
          selectable in campaigns once APPROVED — usually a few minutes,
          occasionally a day.
        </p>

        <div className="flex justify-end gap-2">
          <Btn tone="ghost" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Btn>
          <Btn
            busy={create.isPending}
            onClick={() => {
              if (!name.trim()) return setError("Give the template a name.");
              if (!body.trim()) return setError("Write the message.");
              if (filledExamples.some((v) => !v.trim()))
                return setError(
                  "Fill every example value — Meta rejects a blank one.",
                );
              if (buttons.some((b) => !b.text.trim()))
                return setError("Every button needs a label.");
              if (buttons.some((b) => b.type === "URL" && !b.url?.trim()))
                return setError("A website button needs a URL.");
              if (
                buttons.some(
                  (b) => b.type === "PHONE_NUMBER" && !b.phoneNumber?.trim(),
                )
              )
                return setError("A call button needs a phone number.");
              if (headerHasVar && !headerExample.trim())
                return setError("The header variable needs an example value.");
              setError(null);
              create.mutate();
            }}
          >
            Submit to Meta
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
