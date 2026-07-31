"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { auraApi, queryKeys, type AuraSettings } from "@/src/api/api";
import { SpinnerIcon } from "@/src/components/icons";
import { Btn, Field, inputCls } from "@/src/components/crm/ui";
import { Section } from "@/src/components/aura/ui";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const hourLabel = (hour: number) => {
  const suffix = hour < 12 ? "AM" : "PM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:00 ${suffix}`;
};

export default function AuraSettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.auraSettings,
    queryFn: auraApi.settings,
  });

  const [form, setForm] = useState<AuraSettings | null>(null);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: auraApi.saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auraSettings });
      toast.success("Settings saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const broadcastMutation = useMutation({
    mutationFn: auraApi.broadcast,
    onSuccess: (result) => toast.success(`Sent to ${result.sent} of ${result.targeted} users`),
    onError: (error: Error) => toast.error(error.message),
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  if (isLoading || !form) {
    return (
      <div className="flex h-60 items-center justify-center text-muted-foreground">
        <SpinnerIcon className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const patch = (changes: Partial<AuraSettings>) => setForm({ ...form, ...changes });

  return (
    <div className="space-y-6">
      <Section
        title="Assistant"
        description="The conversational layer. With this off — or with no GEMINI_API_KEY on the server — Aura falls back to rule-based intent parsing, so reminders still work from plain speech."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Toggle
            label="AI assistant enabled"
            checked={form.aiEnabled}
            onChange={(aiEnabled) => patch({ aiEnabled })}
          />
          <Field label="Chat model" hint="Gemini model id used for chat, reports and summaries.">
            <input
              value={form.chatModel}
              onChange={(event) => patch({ chatModel: event.target.value })}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Schedulers"
        description="Hours are in each user's own timezone — one cron serves every zone."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Morning brief">
            <select
              value={form.morningBriefHour}
              onChange={(event) => patch({ morningBriefHour: Number(event.target.value) })}
              className={inputCls}
            >
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {hourLabel(hour)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Nightly report">
            <select
              value={form.dailyReportHour}
              onChange={(event) => patch({ dailyReportHour: Number(event.target.value) })}
              className={inputCls}
            >
              {HOURS.map((hour) => (
                <option key={hour} value={hour}>
                  {hourLabel(hour)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Weekly report day" hint="Sent at the nightly report hour.">
            <select
              value={form.weeklyReportWeekday}
              onChange={(event) => patch({ weeklyReportWeekday: Number(event.target.value) })}
              className={inputCls}
            >
              {WEEKDAYS.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Limits and access">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Max active reminders per user"
            hint="Guards against a runaway automation filling the scheduler."
          >
            <input
              type="number"
              min={10}
              max={5000}
              value={form.maxRemindersPerUser}
              onChange={(event) => patch({ maxRemindersPerUser: Number(event.target.value) })}
              className={inputCls}
            />
          </Field>

          <Field label="Default timezone" hint="Applied to profiles created from now on.">
            <input
              value={form.defaultTimezone}
              onChange={(event) => patch({ defaultTimezone: event.target.value })}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Toggle
            label="Open to new users"
            hint="Off means existing users keep working, but nobody new can set up a profile."
            checked={form.registrationOpen}
            onChange={(registrationOpen) => patch({ registrationOpen })}
          />
        </div>
      </Section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {form.updatedBy
            ? `Last changed by ${form.updatedBy.name ?? form.updatedBy.email ?? "an admin"}.`
            : "Not changed yet."}
        </p>
        <Btn
          busy={saveMutation.isPending}
          onClick={() =>
            saveMutation.mutate({
              aiEnabled: form.aiEnabled,
              chatModel: form.chatModel,
              morningBriefHour: form.morningBriefHour,
              dailyReportHour: form.dailyReportHour,
              weeklyReportWeekday: form.weeklyReportWeekday,
              maxRemindersPerUser: form.maxRemindersPerUser,
              defaultTimezone: form.defaultTimezone,
              registrationOpen: form.registrationOpen,
            })
          }
        >
          Save settings
        </Btn>
      </div>

      <Section
        title="Broadcast"
        description="Sends a push and an inbox item to every active Aura user. Suspended users and anyone inside their quiet hours are skipped."
      >
        <div className="space-y-4">
          <Field label="Title">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="New in Aura"
              className={inputCls}
            />
          </Field>
          <Field label="Message">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              placeholder="Weekly reports now include your best focus window."
              className={inputCls}
            />
          </Field>
          <div className="flex justify-end">
            <Btn
              busy={broadcastMutation.isPending}
              disabled={title.trim().length < 2 || body.trim().length < 2}
              onClick={() =>
                broadcastMutation.mutate(
                  { title: title.trim(), body: body.trim() },
                  {
                    onSuccess: () => {
                      setTitle("");
                      setBody("");
                    },
                  },
                )
              }
            >
              Send to all users
            </Btn>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-border accent-[var(--primary)]"
      />
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}
