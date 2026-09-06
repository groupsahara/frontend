"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ApiError } from "@/src/api/apiClient";
import { crmCampaignsApi } from "@/src/api/api";
import { Btn, Modal, Notice } from "@/src/components/crm/ui";
import {
  TemplateComposer,
  type TemplateChoice,
} from "@/src/components/crm/template-composer";

/**
 * Send one approved template to one person.
 *
 * Marketing to a single customer has the same constraint as a blast: outside
 * the 24-hour window after they last wrote to you, WhatsApp only delivers an
 * approved template. So this reuses the campaign template machinery rather
 * than offering a free-text box that would silently fail most of the time.
 */
export function SendTemplateModal({
  userId,
  name,
  mobile,
  onClose,
  onSent,
}: {
  userId?: number;
  name: string | null;
  mobile: string | null;
  onClose: () => void;
  onSent: (to: string) => void;
}) {
  const [choice, setChoice] = useState<TemplateChoice>({
    name: "",
    language: "",
    params: [],
  });
  const [error, setError] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: () =>
      crmCampaignsApi.sendOne({
        userId,
        mobile: userId ? undefined : (mobile ?? undefined),
        templateName: choice.name,
        templateLanguage: choice.language,
        templateParams: choice.params,
      }),
    onSuccess: (r) => onSent(r.to),
    onError: (e) =>
      setError(
        e instanceof ApiError ? e.message : "Could not send the message.",
      ),
  });

  return (
    <Modal
      title={`WhatsApp ${name ?? mobile ?? "customer"}`}
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        {error && <Notice kind="error">{error}</Notice>}
        {!mobile && !userId && (
          <Notice kind="error">This customer has no mobile number.</Notice>
        )}

        <TemplateComposer
          value={choice}
          onChange={setChoice}
          previewName={name}
          previewTo={mobile ?? undefined}
        />

        <div className="flex justify-end gap-2">
          <Btn tone="ghost" onClick={onClose} disabled={send.isPending}>
            Cancel
          </Btn>
          <Btn
            busy={send.isPending}
            disabled={!choice.name || (!mobile && !userId)}
            onClick={() => {
              if (!choice.name) return setError("Pick a template first.");
              if (choice.params.some((p) => !p.trim()))
                return setError(
                  "Fill every variable — a blank one sends an empty line.",
                );
              setError(null);
              send.mutate();
            }}
          >
            Send message
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
