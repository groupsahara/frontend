"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ApiError } from "@/src/api/apiClient";
import { crmCampaignsApi } from "@/src/api/api";
import { Btn, Field, inputCls, Modal, Notice } from "@/src/components/crm/ui";
import {
  TemplateComposer,
  type TemplateChoice,
} from "@/src/components/crm/template-composer";

/**
 * Run a template campaign against a hand-picked set of customers.
 *
 * This creates a real campaign rather than looping single sends, so the picked
 * audience gets the same ledger, pacing, opt-out checks, resume and delivery
 * tracking as a full blast — and shows up in the campaign list afterwards
 * instead of vanishing into the logs.
 */
export function SendCampaignModal({
  userIds,
  sampleName,
  onClose,
  onStarted,
}: {
  userIds: number[];
  /** Stands in for {{name}} in the preview — one of the picked customers. */
  sampleName: string | null;
  onClose: () => void;
  onStarted: (name: string, queued: number) => void;
}) {
  const [name, setName] = useState("");
  const [choice, setChoice] = useState<TemplateChoice>({
    name: "",
    language: "",
    params: [],
  });
  const [error, setError] = useState<string | null>(null);

  const run = useMutation({
    mutationFn: async () => {
      const campaign = await crmCampaignsApi.create({
        name: name.trim(),
        channel: "WHATSAPP",
        segment: "SELECTED_CUSTOMERS",
        // Not delivered — the approved template is. Kept as the record of why
        // this campaign existed, which the campaign list shows.
        message: `Template ${choice.name} to ${userIds.length} selected customers`,
        templateName: choice.name,
        templateLanguage: choice.language,
        templateParams: choice.params,
        recipientUserIds: userIds,
      });
      const started = await crmCampaignsApi.sendTemplate(campaign.campaignId);
      return { campaign, started };
    },
    onSuccess: (r) => onStarted(r.campaign.name, r.started.pending),
    onError: (e) =>
      setError(
        e instanceof ApiError ? e.message : "Could not start the campaign.",
      ),
  });

  return (
    <Modal
      title={`Send to ${userIds.length} selected customers`}
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        {error && <Notice kind="error">{error}</Notice>}

        <Field
          label="Campaign name *"
          hint="So you can find this run in the campaign list later"
        >
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Weekend offer — selected regulars"
          />
        </Field>

        <TemplateComposer
          value={choice}
          onChange={setChoice}
          previewName={sampleName}
          previewTo={`${userIds.length} customers`}
        />

        <p className="text-xs text-muted-foreground">
          Anyone who has opted out, has no mobile, or whose number is not a
          valid Indian mobile is skipped and recorded as such — so the number
          actually messaged may be lower than {userIds.length}.
        </p>

        <div className="flex justify-end gap-2">
          <Btn tone="ghost" onClick={onClose} disabled={run.isPending}>
            Cancel
          </Btn>
          <Btn
            busy={run.isPending}
            disabled={!choice.name || !userIds.length}
            onClick={() => {
              if (!name.trim()) return setError("Give the campaign a name.");
              if (!choice.name) return setError("Pick a template first.");
              if (choice.params.some((p) => !p.trim()))
                return setError(
                  "Fill every variable — a blank one sends an empty line.",
                );
              setError(null);
              run.mutate();
            }}
          >
            Send campaign
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
