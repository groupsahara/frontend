"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ApiError } from "@/src/api/apiClient";
import {
  RESTAURANT_DECISIONS,
  RESTAURANT_PAIN_POINTS,
  RESTAURANT_STAFF_ROLES,
  crmRestaurantsApi,
  type RestaurantBody,
  type RestaurantRow,
  type RestaurantStatus,
} from "@/src/api/api";
import { Btn, Field, inputCls, Modal, Notice } from "@/src/components/crm/ui";

export const RESTAURANT_TYPES = ["Fine Dine", "QSR", "Cafe", "Cloud Kitchen", "Banquet", "Other"];
export const RESTAURANT_STATUSES: RestaurantStatus[] = [
  "PROSPECT",
  "ACTIVE",
  "INACTIVE",
  "CHURNED",
];

/** Section heading inside the onboarding form. */
function Section({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="sm:col-span-2 border-t border-border pt-4 first:border-0 first:pt-0">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Multi-select rendered as checkboxes — the sales form's own layout. */
function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="sm:col-span-2">
      <span className="mb-2 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((o) => (
          <label
            key={o}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground transition hover:bg-accent/50"
          >
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={selected.includes(o)}
              onChange={() => onToggle(o)}
            />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}

/**
 * Visit documentation: pick a photo, it uploads immediately and the form keeps
 * the hosted URL. Uploading on selection (rather than on submit) means the
 * executive sees the picture that will be filed before they save, and a failed
 * upload never costs them the rest of the form.
 */
function PhotoField({
  label,
  url,
  onChange,
}: {
  label: string;
  url: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [err, setErr] = useState("");

  const upload = useMutation({
    mutationFn: (file: File) => crmRestaurantsApi.uploadPhoto(file),
    onSuccess: (res) => {
      setErr("");
      onChange(res.url);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Upload failed"),
  });

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset so re-picking the same file after a failure still fires.
          e.target.value = "";
          if (file) upload.mutate(file);
        }}
      />
      {url ? (
        <div className="flex items-center gap-3 rounded-xl border border-border p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote CDN host, no loader configured */}
          <img src={url} alt={label} className="h-14 w-14 rounded-lg object-cover" />
          <div className="flex gap-2">
            <Btn tone="ghost" small onClick={() => inputRef.current?.click()}>
              Replace
            </Btn>
            <Btn tone="ghost" small onClick={() => onChange("")}>
              Remove
            </Btn>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
        >
          {upload.isPending ? "Uploading…" : "⬆ Upload photo"}
        </button>
      )}
      <span className="mt-1 block text-xs text-muted-foreground">
        {err || "visit documentation — JPG/PNG up to 10 MB"}
      </span>
    </div>
  );
}

/**
 * Restaurant onboarding — the sales executive's visit form, end to end.
 *
 * One component for both create and edit so the fields can never drift apart:
 * the list page opens it empty to onboard a new restaurant, the detail page
 * opens it with a row to correct one.
 */
export function RestaurantFormModal({
  restaurant,
  onClose,
  onSaved,
}: {
  restaurant: RestaurantRow | null;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [form, setForm] = useState({
    name: restaurant?.name ?? "",
    ownerName: restaurant?.ownerName ?? "",
    contactNumber: restaurant?.contactNumber ?? "",
    email: restaurant?.email ?? "",
    gstNumber: restaurant?.gstNumber ?? "",
    address: restaurant?.address ?? "",
    city: restaurant?.city ?? "",
    restaurantType: restaurant?.restaurantType ?? "",
    outlets: String(restaurant?.outlets ?? 1),
    status: restaurant?.status ?? "PROSPECT",
    agreementStart: restaurant?.agreementStart?.slice(0, 10) ?? "",
    agreementEnd: restaurant?.agreementEnd?.slice(0, 10) ?? "",
    servicePackage: restaurant?.servicePackage ?? "",
    pricingPlan: restaurant?.pricingPlan ?? "",
    fssaiNumber: restaurant?.fssaiNumber ?? "",
    agreementCopyUrl: restaurant?.agreementCopyUrl ?? "",
    gstCertificateUrl: restaurant?.gstCertificateUrl ?? "",
    fssaiLicenseUrl: restaurant?.fssaiLicenseUrl ?? "",
    notes: restaurant?.notes ?? "",
    linkedUserId: restaurant?.linkedUserId != null ? String(restaurant.linkedUserId) : "",
    // Visit capture
    staffRequired: restaurant?.staffRequired != null ? String(restaurant.staffRequired) : "",
    requiredDate: restaurant?.requiredDate?.slice(0, 10) ?? "",
    visitDate: restaurant?.visitDate?.slice(0, 10) ?? "",
    decisionStatus: restaurant?.decisionStatus ?? "",
    salesExecutive: restaurant?.salesExecutive ?? "",
    salesFeedback: restaurant?.salesFeedback ?? "",
    appInstalled: restaurant?.appInstalled ? "yes" : "no",
    restaurantPhotoUrl: restaurant?.restaurantPhotoUrl ?? "",
    meetingPhotoUrl: restaurant?.meetingPhotoUrl ?? "",
  });
  const [painPoints, setPainPoints] = useState<string[]>(restaurant?.painPoints ?? []);
  const [staffRoles, setStaffRoles] = useState<string[]>(restaurant?.requiredStaffRoles ?? []);
  const [err, setErr] = useState("");

  const save = useMutation({
    mutationFn: (body: RestaurantBody & { name: string }) =>
      restaurant
        ? crmRestaurantsApi.update(restaurant.restaurantId, body)
        : crmRestaurantsApi.create(body),
    onSuccess: (row) => onSaved(row.name),
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Could not save restaurant."),
  });

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const opt = (v: string) => (v.trim() ? v.trim() : undefined);
  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <Modal
      wide
      title={restaurant ? `Edit ${restaurant.name}` : "Onboard restaurant"}
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErr("");
          const name = form.name.trim();
          if (!name) return setErr("Name is required.");
          save.mutate({
            name,
            status: form.status as RestaurantStatus,
            outlets: Number(form.outlets) || 1,
            ownerName: opt(form.ownerName),
            contactNumber: opt(form.contactNumber),
            email: opt(form.email),
            gstNumber: opt(form.gstNumber),
            address: opt(form.address),
            city: opt(form.city),
            restaurantType: opt(form.restaurantType),
            agreementStart: opt(form.agreementStart),
            agreementEnd: opt(form.agreementEnd),
            servicePackage: opt(form.servicePackage),
            pricingPlan: opt(form.pricingPlan),
            fssaiNumber: opt(form.fssaiNumber),
            agreementCopyUrl: opt(form.agreementCopyUrl),
            gstCertificateUrl: opt(form.gstCertificateUrl),
            fssaiLicenseUrl: opt(form.fssaiLicenseUrl),
            notes: opt(form.notes),
            linkedUserId: form.linkedUserId.trim() ? Number(form.linkedUserId) : undefined,
            // Visit capture. The two multi-selects are always sent so clearing
            // every box actually clears them on the record.
            painPoints,
            requiredStaffRoles: staffRoles,
            staffRequired: form.staffRequired.trim() ? Number(form.staffRequired) : undefined,
            requiredDate: opt(form.requiredDate),
            visitDate: opt(form.visitDate),
            decisionStatus: opt(form.decisionStatus),
            salesExecutive: opt(form.salesExecutive),
            salesFeedback: opt(form.salesFeedback),
            appInstalled: form.appInstalled === "yes",
            restaurantPhotoUrl: opt(form.restaurantPhotoUrl),
            meetingPhotoUrl: opt(form.meetingPhotoUrl),
          });
        }}
      >
        {err && <Notice kind="error">{err}</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title="Restaurant details" />
          <div className="sm:col-span-2">
            <Field label="Restaurant name">
              <input className={inputCls} value={form.name} onChange={set("name")} autoFocus />
            </Field>
          </div>
          <Field label="Owner name">
            <input className={inputCls} value={form.ownerName} onChange={set("ownerName")} />
          </Field>
          <Field label="Contact number">
            <input
              className={inputCls}
              value={form.contactNumber}
              onChange={set("contactNumber")}
              inputMode="numeric"
              placeholder="9876543210"
            />
          </Field>
          <Field label="Email">
            <input className={inputCls} type="email" value={form.email} onChange={set("email")} />
          </Field>
          <Field label="GST number">
            <input className={inputCls} value={form.gstNumber} onChange={set("gstNumber")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Restaurant address">
              <input className={inputCls} value={form.address} onChange={set("address")} />
            </Field>
          </div>
          <Field label="City">
            <input className={inputCls} value={form.city} onChange={set("city")} />
          </Field>
          <Field label="Business type">
            <select
              className={inputCls}
              value={form.restaurantType}
              onChange={set("restaurantType")}
            >
              <option value="">Choose…</option>
              {RESTAURANT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Outlets">
            <input
              className={inputCls}
              type="number"
              min={1}
              value={form.outlets}
              onChange={set("outlets")}
            />
          </Field>
          <Field label="Status">
            <select className={inputCls} value={form.status} onChange={set("status")}>
              {RESTAURANT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>

          <Section
            title="Visit & requirement"
            hint="What the sales executive captured at the restaurant."
          />
          <CheckboxGroup
            label="Operational pain points"
            options={RESTAURANT_PAIN_POINTS}
            selected={painPoints}
            onToggle={(v) => setPainPoints((p) => toggle(p, v))}
          />
          <CheckboxGroup
            label="Required staff roles"
            options={RESTAURANT_STAFF_ROLES}
            selected={staffRoles}
            onToggle={(v) => setStaffRoles((p) => toggle(p, v))}
          />
          <Field label="Number of staff required">
            <input
              className={inputCls}
              type="number"
              min={0}
              value={form.staffRequired}
              onChange={set("staffRequired")}
            />
          </Field>
          <Field label="Required date" hint="when the staff are needed from">
            <input
              className={inputCls}
              type="date"
              value={form.requiredDate}
              onChange={set("requiredDate")}
            />
          </Field>
          <Field label="Decision & follow-up">
            <select
              className={inputCls}
              value={form.decisionStatus}
              onChange={set("decisionStatus")}
            >
              <option value="">Choose…</option>
              {RESTAURANT_DECISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="App install">
            <select className={inputCls} value={form.appInstalled} onChange={set("appInstalled")}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </Field>
          <Field label="Sales executive">
            <input
              className={inputCls}
              value={form.salesExecutive}
              onChange={set("salesExecutive")}
              placeholder="Who made the visit"
            />
          </Field>
          <Field label="Visit date">
            <input
              className={inputCls}
              type="date"
              value={form.visitDate}
              onChange={set("visitDate")}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Sales executive feedback">
              <textarea
                className={inputCls}
                rows={3}
                value={form.salesFeedback}
                onChange={set("salesFeedback")}
              />
            </Field>
          </div>
          <PhotoField
            label="Restaurant photo"
            url={form.restaurantPhotoUrl}
            onChange={(url) => setForm((f) => ({ ...f, restaurantPhotoUrl: url }))}
          />
          <PhotoField
            label="Meeting photo"
            url={form.meetingPhotoUrl}
            onChange={(url) => setForm((f) => ({ ...f, meetingPhotoUrl: url }))}
          />

          <Section title="Contract & documents" />
          <Field label="Agreement start">
            <input
              className={inputCls}
              type="date"
              value={form.agreementStart}
              onChange={set("agreementStart")}
            />
          </Field>
          <Field label="Agreement end">
            <input
              className={inputCls}
              type="date"
              value={form.agreementEnd}
              onChange={set("agreementEnd")}
            />
          </Field>
          <Field label="Service package">
            <input
              className={inputCls}
              value={form.servicePackage}
              onChange={set("servicePackage")}
            />
          </Field>
          <Field label="Pricing plan">
            <input className={inputCls} value={form.pricingPlan} onChange={set("pricingPlan")} />
          </Field>
          <Field label="FSSAI number">
            <input className={inputCls} value={form.fssaiNumber} onChange={set("fssaiNumber")} />
          </Field>
          <Field
            label="Linked customer userId"
            hint="optional — the customer login that places this restaurant's bookings"
          >
            <input
              className={inputCls}
              type="number"
              value={form.linkedUserId}
              onChange={set("linkedUserId")}
            />
          </Field>
          <Field label="Agreement copy URL">
            <input
              className={inputCls}
              value={form.agreementCopyUrl}
              onChange={set("agreementCopyUrl")}
              placeholder="https://"
            />
          </Field>
          <Field label="GST certificate URL">
            <input
              className={inputCls}
              value={form.gstCertificateUrl}
              onChange={set("gstCertificateUrl")}
              placeholder="https://"
            />
          </Field>
          <Field label="FSSAI license URL">
            <input
              className={inputCls}
              value={form.fssaiLicenseUrl}
              onChange={set("fssaiLicenseUrl")}
              placeholder="https://"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea className={inputCls} rows={3} value={form.notes} onChange={set("notes")} />
            </Field>
          </div>
        </div>
        {/* Pinned to the bottom of the scroll area — this form is long enough
            that hunting for Save at the end of it is a chore. */}
        <div className="sticky bottom-0 -mx-6 -mb-5 flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
          <Btn tone="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" busy={save.isPending}>
            {restaurant ? "Save changes" : "Onboard restaurant"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
