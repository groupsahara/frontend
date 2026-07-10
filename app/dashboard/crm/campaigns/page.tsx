"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/src/api/apiClient";
import {
  crmCampaignsApi,
  crmQueryKeys,
  type CampaignChannel,
  type CampaignRow,
  type CampaignSegment,
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
  fmtDate,
  fmtTime,
} from "@/src/components/crm/ui";
import { PencilIcon, PlusIcon, TrashIcon } from "@/src/components/icons";
import { hasPermission } from "@/src/lib/auth";

const PAGE_SIZE = 20;

const CHANNELS: CampaignChannel[] = ["EMAIL", "WHATSAPP", "SMS"];

const SEGMENTS: { key: CampaignSegment; label: string; hint: string }[] = [
  { key: "ALL_CLIENTS", label: "All clients", hint: "Every active customer account" },
  { key: "ACTIVE_CLIENTS", label: "Active clients", hint: "Booked in the last 90 days" },
  { key: "INACTIVE_CLIENTS", label: "Inactive clients", hint: "Have booked before, but not in the last 90 days" },
  { key: "HIGH_REVENUE_CLIENTS", label: "High revenue clients", hint: "Top 20% by completed-booking revenue" },
  { key: "POTENTIAL_CLIENTS", label: "Potential clients", hint: "Signed up but never booked" },
];

const segmentLabel = (key: string) => SEGMENTS.find((s) => s.key === key)?.label ?? key;

const statusToneMap: Record<string, string> = {
  DRAFT: "warning",
  SENDING: "primary",
  SENT: "success",
  FAILED: "danger",
};

export default function CrmCampaignsPage() {
  const qc = useQueryClient();
  const [channel, setChannel] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CampaignRow | null>(null);
  const [confirmSend, setConfirmSend] = useState<CampaignRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CampaignRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage = hasPermission("campaigns.manage");

  // Deep link: /dashboard/crm/campaigns?new=1 opens the create modal.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") setAdding(true);
  }, []);

  const params = {
    channel: channel === "ALL" ? undefined : channel,
    status: status === "ALL" ? undefined : status,
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: crmQueryKeys.campaigns(params),
    queryFn: () => crmCampaignsApi.list(params),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["crm", "campaigns"] });

  const send = useMutation({
    mutationFn: (id: number) => crmCampaignsApi.send(id),
    onSuccess: (c) => {
      setConfirmSend(null);
      setActionError(null);
      setNotice(
        c.status === "SENT"
          ? `Campaign “${c.name}” sent to ${c.sentCount} of ${c.recipientCount} recipients${c.failedCount ? ` (${c.failedCount} failed)` : ""}.`
          : `Campaign “${c.name}” failed — ${c.failedCount} of ${c.recipientCount} sends errored. Check the channel credentials.`,
      );
      invalidate();
    },
    onError: (e) => {
      setConfirmSend(null);
      setActionError(e instanceof ApiError ? e.message : "Could not send campaign.");
    },
  });

  const del = useMutation({
    mutationFn: (id: number) => crmCampaignsApi.remove(id),
    onSuccess: () => {
      setConfirmDelete(null);
      setActionError(null);
      setNotice("Campaign deleted.");
      invalidate();
    },
    onError: (e) => {
      setConfirmDelete(null);
      setActionError(e instanceof ApiError ? e.message : "Could not delete campaign.");
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Marketing Campaigns"
        subtitle="Email, WhatsApp and SMS blasts over live customer segments"
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
              New campaign
            </Btn>
          ) : undefined
        }
      />
      {error instanceof ApiError && <Notice kind="error">{error.message}</Notice>}
      {actionError && <Notice kind="error">{actionError}</Notice>}
      {notice && <Notice kind="success">{notice}</Notice>}

      <div className="flex flex-wrap gap-3">
        <select
          className={`${inputCls} w-auto`}
          value={channel}
          onChange={(e) => {
            setChannel(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">All channels</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className={`${inputCls} w-auto`}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="ALL">All statuses</option>
          {["DRAFT", "SENDING", "SENT", "FAILED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <TableShell
          head={["Name", "Channel", "Segment", "Status", "Recipients", "Sent / Failed", "Sent at", "By", "Actions"]}
        >
          {isLoading && <EmptyRow cols={9} label="Loading campaigns…" />}
          {!isLoading && !data?.campaigns.length && (
            <EmptyRow cols={9} label="No campaigns yet — create one to reach your clients." />
          )}
          {data?.campaigns.map((c) => (
            <tr key={c.campaignId} className="text-foreground">
              <td className="px-4 py-3 font-medium">{c.name}</td>
              <td className="px-4 py-3">
                <Badge tone="primary">{c.channel}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge tone="muted">{segmentLabel(c.segment)}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge tone={statusToneMap[c.status] ?? "muted"}>{c.status}</Badge>
              </td>
              <td className="px-4 py-3">{c.recipientCount || "—"}</td>
              <td className="px-4 py-3">
                {c.status === "SENT" || c.status === "FAILED" ? `${c.sentCount} / ${c.failedCount}` : "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {c.sentAt ? `${fmtDate(c.sentAt)} ${fmtTime(c.sentAt)}` : "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{c.createdBy?.name ?? "—"}</td>
              <td className="px-4 py-3">
                {canManage && (
                  <div className="flex items-center gap-1.5">
                    {(c.status === "DRAFT" || c.status === "FAILED") && (
                      <Btn small tone="success" onClick={() => setConfirmSend(c)}>
                        Send
                      </Btn>
                    )}
                    {c.status === "DRAFT" && (
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        onClick={() => setEditing(c)}
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    )}
                    {c.status !== "SENDING" && (
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-danger transition-colors hover:bg-danger/10"
                        onClick={() => setConfirmDelete(c)}
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </TableShell>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Btn tone="ghost" small disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </Btn>
            <Btn tone="ghost" small disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Btn>
          </div>
        </div>
      </Card>

      {(adding || editing) && (
        <CampaignFormModal
          campaign={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={(name, created) => {
            setAdding(false);
            setEditing(null);
            setActionError(null);
            setNotice(`Campaign “${name}” ${created ? "created" : "updated"}. Send it when ready.`);
            invalidate();
          }}
        />
      )}

      {confirmSend && (
        <Modal title="Send campaign now?" onClose={() => setConfirmSend(null)}>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{confirmSend.name}</strong> will go out via{" "}
            <strong className="text-foreground">{confirmSend.channel}</strong> to the{" "}
            <strong className="text-foreground">{segmentLabel(confirmSend.segment)}</strong> segment.
            The audience is resolved live at send time and messages go out immediately.
          </p>
          {confirmSend.channel === "WHATSAPP" && (
            <p className="mt-2 text-xs text-muted-foreground">
              WhatsApp free-form texts only reach users active in the last 24h window.
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Btn tone="ghost" onClick={() => setConfirmSend(null)} disabled={send.isPending}>
              Cancel
            </Btn>
            <Btn busy={send.isPending} onClick={() => send.mutate(confirmSend.campaignId)}>
              {send.isPending ? "Sending…" : "Send now"}
            </Btn>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete campaign?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-muted-foreground">
            This will permanently delete{" "}
            <strong className="text-foreground">{confirmDelete.name}</strong> and its send stats.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Btn tone="ghost" onClick={() => setConfirmDelete(null)} disabled={del.isPending}>
              Cancel
            </Btn>
            <Btn tone="danger" busy={del.isPending} onClick={() => del.mutate(confirmDelete.campaignId)}>
              Delete campaign
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------- Create / edit modal -------------------------- */

function CampaignFormModal({
  campaign,
  onClose,
  onSaved,
}: {
  campaign: CampaignRow | null;
  onClose: () => void;
  onSaved: (name: string, created: boolean) => void;
}) {
  const [name, setName] = useState(campaign?.name ?? "");
  const [channel, setChannel] = useState<string>(campaign?.channel ?? "EMAIL");
  const [segment, setSegment] = useState<string>(campaign?.segment ?? "ALL_CLIENTS");
  const [subject, setSubject] = useState(campaign?.subject ?? "");
  const [message, setMessage] = useState(campaign?.message ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  // Live audience preview for the picked segment + channel.
  const preview = useQuery({
    queryKey: crmQueryKeys.segmentPreview(segment, channel),
    queryFn: () => crmCampaignsApi.previewSegment(segment, channel),
    retry: false,
  });

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        channel,
        segment,
        subject: channel === "EMAIL" ? subject.trim() : undefined,
        message: message.trim(),
      };
      return campaign
        ? crmCampaignsApi.update(campaign.campaignId, body)
        : crmCampaignsApi.create(body as typeof body & { name: string; channel: string; segment: string; message: string });
    },
    onSuccess: (c) => onSaved(c.name, !campaign),
    onError: (e) =>
      setFormError(e instanceof ApiError ? e.message : "Could not save the campaign."),
  });

  const submit = () => {
    if (!name.trim()) return setFormError("Give the campaign a name.");
    if (channel === "EMAIL" && !subject.trim())
      return setFormError("Email campaigns need a subject.");
    if (!message.trim()) return setFormError("Write the campaign message.");
    setFormError(null);
    save.mutate();
  };

  const segmentHint = SEGMENTS.find((s) => s.key === segment)?.hint;

  return (
    <Modal title={campaign ? "Edit campaign" : "New campaign"} onClose={onClose} wide>
      <div className="space-y-4">
        {formError && <Notice kind="error">{formError}</Notice>}
        <Field label="Campaign name *">
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Diwali staffing offer"
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Channel">
            <select className={inputCls} value={channel} onChange={(e) => setChannel(e.target.value)}>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Segment" hint={segmentHint}>
            <select className={inputCls} value={segment} onChange={(e) => setSegment(e.target.value)}>
              {SEGMENTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="rounded-xl border border-border bg-accent/40 px-4 py-3 text-sm">
          {preview.isLoading && <span className="text-muted-foreground">Counting audience…</span>}
          {preview.isError && (
            <span className="text-muted-foreground">Audience preview unavailable.</span>
          )}
          {preview.data && (
            <>
              <span className="font-medium text-foreground">
                ≈ {preview.data.count} reachable recipient{preview.data.count === 1 ? "" : "s"}
              </span>
              {preview.data.sample.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  e.g.{" "}
                  {preview.data.sample
                    .map((r) => r.name || r.email || r.mobile)
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(", ")}
                </span>
              )}
            </>
          )}
        </div>

        {channel === "EMAIL" && (
          <Field label="Subject *">
            <input
              className={inputCls}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Trained kitchen staff, on demand"
            />
          </Field>
        )}
        <Field
          label="Message *"
          hint={
            channel === "WHATSAPP"
              ? "WhatsApp free-form texts only reach users active in the last 24h window."
              : undefined
          }
        >
          <textarea
            className={`${inputCls} min-h-32`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi! Restocare can staff your kitchen this festive season…"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn tone="ghost" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Btn>
          <Btn busy={save.isPending} onClick={submit}>
            {campaign ? "Save changes" : "Create draft"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
