"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  dispatchApi,
  queryKeys,
  type AllocationMethod,
  type AllocationSettings,
} from "@/src/api/api";
import { ApiError } from "@/src/api/apiClient";
import { SpinnerIcon } from "@/src/components/icons";

const METHODS: { key: AllocationMethod; label: string; description: string }[] = [
  {
    key: "BROADCAST",
    label: "Broadcast",
    description: "Every eligible partner in range gets the lead at the same time.",
  },
  {
    key: "NEAREST",
    label: "Nearest first",
    description: "Closest partners get the lead, capped at the max partners below.",
  },
  {
    key: "ROUND_ROBIN",
    label: "Round robin",
    description: "Partners with the fewest jobs get the lead first, so work rotates fairly.",
  },
];

type FormState = Pick<
  AllocationSettings,
  "enabled" | "method" | "radiusKm" | "maxAgents" | "restrictToGeofence"
>;

export default function AutoAllocationPage() {
  const queryClient = useQueryClient();
  // Local edits overlay the server copy; null = no unsaved edits.
  const [edits, setEdits] = useState<FormState | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.allocationSettings,
    queryFn: () => dispatchApi.getAllocationSettings(),
  });

  const form: FormState | null =
    edits ??
    (data
      ? {
          enabled: data.enabled,
          method: data.method,
          radiusKm: data.radiusKm,
          maxAgents: data.maxAgents,
          restrictToGeofence: data.restrictToGeofence,
        }
      : null);
  const setForm = (next: FormState) => setEdits(next);

  const mutation = useMutation({
    mutationFn: (body: FormState) => dispatchApi.updateAllocationSettings(body),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.allocationSettings, saved);
      setEdits(null);
      setNotice({ kind: "ok", text: "Allocation settings saved. New bookings use them immediately." });
    },
    onError: (e) =>
      setNotice({
        kind: "error",
        text: e instanceof ApiError ? e.message : "Could not save the settings.",
      }),
  });

  if (isLoading || (!form && !isError)) {
    return (
      <div className="flex h-72 items-center justify-center text-muted-foreground">
        <SpinnerIcon className="h-6 w-6" />
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3 text-center">
        <p className="text-muted-foreground">Couldn’t load allocation settings.</p>
        <button
          onClick={() => refetch()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  const capDisabled = form.method === "BROADCAST";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Auto Allocation</h1>
        <p className="text-sm text-muted-foreground">
          How new booking leads are pushed to service partners. Changes apply to the next booking.
        </p>
      </div>

      {notice ? (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm ${
            notice.kind === "ok" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="hover:opacity-70">
            ✕
          </button>
        </div>
      ) : null}

      <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
        {/* Master switch */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Auto allocation</p>
            <p className="text-sm text-muted-foreground">
              When off, new bookings are <strong>not</strong> broadcast — leads must be handled
              manually.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.enabled}
            onClick={() => setForm({ ...form, enabled: !form.enabled })}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
              form.enabled ? "bg-success" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                form.enabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Method */}
        <div>
          <p className="mb-2 text-sm font-semibold text-foreground">Allocation method</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {METHODS.map((m) => {
              const active = form.method === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setForm({ ...form, method: m.key })}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-primary bg-primary/5 ring-2 ring-ring/30"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <p className={`text-sm font-semibold ${active ? "text-primary" : "text-foreground"}`}>
                    {m.label}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Numbers */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Service radius (km)
            </label>
            <input
              type="number"
              min={0.5}
              max={500}
              step={0.5}
              value={form.radiusKm}
              onChange={(e) => setForm({ ...form, radiusKm: Number(e.target.value) })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Partners farther than this from the booking don’t receive the lead.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Max partners per lead
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.maxAgents}
              disabled={capDisabled}
              onChange={(e) => setForm({ ...form, maxAgents: Number(e.target.value) })}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {capDisabled
                ? "Broadcast always reaches everyone in range."
                : "0 = no cap. Applies to Nearest first and Round robin."}
            </p>
          </div>
        </div>

        {/* Geofence restriction */}
        <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
          <div>
            <p className="text-sm font-semibold text-foreground">Restrict to geofence</p>
            <p className="text-sm text-muted-foreground">
              When a booking lands inside an active zone, only that zone’s partners (or its team)
              get the lead. Bookings outside every zone fall back to the radius rule.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.restrictToGeofence}
            onClick={() => setForm({ ...form, restrictToGeofence: !form.restrictToGeofence })}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
              form.restrictToGeofence ? "bg-success" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                form.restrictToGeofence ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
          {data && (
            <span className="text-xs text-muted-foreground">
              Last saved{" "}
              {new Date(data.updatedAt).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            type="button"
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending || form.radiusKm < 0.5}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending ? <SpinnerIcon className="h-4 w-4" /> : null}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
