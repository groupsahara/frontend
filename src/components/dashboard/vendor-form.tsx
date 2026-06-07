"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  vendorApi,
  type Vendor,
  type VendorInput,
  type VendorStatus,
} from "@/src/api/api";
import { ApiError } from "@/src/api/apiClient";
import { CloseIcon, SpinnerIcon } from "@/src/components/icons";

interface VendorFormProps {
  vendor: Vendor | null; // null => create
  onClose: () => void;
}

const STATUS_OPTIONS: { value: VendorStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "AWAITING_APPROVAL", label: "Awaiting Approval" },
  { value: "BLOCKED", label: "Blocked" },
];

export function VendorForm({ vendor, onClose }: VendorFormProps) {
  const isEdit = Boolean(vendor);
  const queryClient = useQueryClient();

  const [form, setForm] = useState<VendorInput>({
    name: vendor?.name ?? "",
    email: vendor?.email ?? "",
    mobile: vendor?.mobile ?? "",
    icon: vendor?.icon ?? "",
    description: vendor?.description ?? "",
    address: vendor?.address ?? "",
    city: vendor?.city ?? "",
    isOpen: vendor?.isOpen ?? true,
    status: vendor?.status ?? "ACTIVE",
    offersServices: vendor?.offersServices ?? true,
    canAddCategory: vendor?.canAddCategory ?? false,
    commissionPercentage: vendor?.commissionPercentage ?? 0,
  });

  const mutation = useMutation({
    mutationFn: (payload: VendorInput) => {
      // Drop empty optional strings so we don't fail backend email validation.
      const clean: VendorInput = {
        ...payload,
        email: payload.email?.trim() || undefined,
        mobile: payload.mobile?.trim() || undefined,
        icon: payload.icon?.trim() || undefined,
        description: payload.description?.trim() || undefined,
        address: payload.address?.trim() || undefined,
        city: payload.city?.trim() || undefined,
      };
      return vendor
        ? vendorApi.update(vendor.vendorId, clean)
        : vendorApi.create(clean);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      onClose();
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const set = <K extends keyof VendorInput>(key: K, value: VendorInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const errorMessage =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? "Something went wrong." : null;

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? "Edit vendor" : "Add vendor"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Name *">
              <input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Plumber"
                className={inputClass}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="vendor@restocare.in"
                className={inputClass}
              />
            </Field>
            <Field label="Mobile">
              <input
                value={form.mobile}
                onChange={(e) => set("mobile", e.target.value)}
                placeholder="9953429462"
                className={inputClass}
              />
            </Field>
            <Field label="City">
              <input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Delhi"
                className={inputClass}
              />
            </Field>
            <Field label="Address" full>
              <input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="KD-180, Block KD, Pitampura, Delhi"
                className={inputClass}
              />
            </Field>
            <Field label="Icon URL" full>
              <input
                value={form.icon}
                onChange={(e) => set("icon", e.target.value)}
                placeholder="https://…/icon.png"
                className={inputClass}
              />
            </Field>
            <Field label="Commission %">
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.commissionPercentage}
                onChange={(e) => set("commissionPercentage", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as VendorStatus)}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex flex-wrap gap-5 pt-1">
            <Toggle
              label="Open"
              checked={form.isOpen ?? false}
              onChange={(v) => set("isOpen", v)}
            />
            <Toggle
              label="Offers services"
              checked={form.offersServices ?? false}
              onChange={(v) => set("offersServices", v)}
            />
            <Toggle
              label="Can add category"
              checked={form.canAddCategory ?? false}
              onChange={(v) => set("canAddCategory", v)}
            />
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {mutation.isPending && <SpinnerIcon className="h-4 w-4" />}
              {isEdit ? "Save changes" : "Create vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2"
    >
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>
  );
}
