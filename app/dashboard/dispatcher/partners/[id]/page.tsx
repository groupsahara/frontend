"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  categoryTreeApi,
  dispatcherApi,
  queryKeys,
  type PartnerDetail,
  type UpdatePartnerInput,
} from "@/src/api/api";
import { ApiError } from "@/src/api/apiClient";
import { ConfirmDialog } from "@/src/components/dashboard/confirm-dialog";
import { SpinnerIcon, StarIcon } from "@/src/components/icons";

export default function PartnerDetailPage() {
  const params = useParams<{ id: string }>();
  const professionalId = Number(params?.id);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.partner(professionalId),
    queryFn: () => dispatcherApi.getPartner(professionalId),
    enabled: Number.isFinite(professionalId),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/dashboard/dispatcher/partners"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Back to Service Partners
      </Link>

      {isLoading ? (
        <div className="flex h-60 items-center justify-center text-muted-foreground">
          <SpinnerIcon className="h-6 w-6" />
        </div>
      ) : isError || !data ? (
        <div className="flex h-60 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card text-center">
          <p className="text-muted-foreground">Couldn’t load this partner.</p>
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Retry
          </button>
        </div>
      ) : (
        <PartnerEditor partner={data} />
      )}
    </div>
  );
}

function PartnerEditor({ partner }: { partner: PartnerDetail }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState(partner.name === "—" ? "" : partner.name);
  const [city, setCity] = useState(partner.city ?? "");
  const [experience, setExperience] = useState(
    partner.experience != null ? String(partner.experience) : "",
  );
  const [description, setDescription] = useState(partner.description ?? "");
  const [categoryId, setCategoryId] = useState<number | "">(partner.categoryId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Top-level categories the partner can be reassigned to.
  const { data: tree } = useQuery({
    queryKey: queryKeys.categoryTree,
    queryFn: () => categoryTreeApi.tree(),
  });
  const categoryOptions = tree ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.partner(partner.professionalId) });
    queryClient.invalidateQueries({ queryKey: ["dispatcher", "partners"] });
  };

  const saveMutation = useMutation({
    mutationFn: (body: UpdatePartnerInput) =>
      dispatcherApi.updatePartner(partner.professionalId, body),
    onSuccess: (res) => {
      setNotice(res.message);
      invalidate();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not update partner."),
  });

  const blockMutation = useMutation({
    mutationFn: (isBlocked: boolean) =>
      dispatcherApi.setPartnerBlocked(partner.professionalId, isBlocked),
    onSuccess: (res) => {
      setNotice(res.message);
      invalidate();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Action failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => dispatcherApi.deletePartner(partner.professionalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatcher", "partners"] });
      router.replace("/dashboard/dispatcher/partners");
    },
    onError: (e) => {
      setConfirmDelete(false);
      setError(e instanceof ApiError ? e.message : "Could not delete partner.");
    },
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const exp = experience.trim();
    if (exp && (!/^\d+$/.test(exp) || Number(exp) < 0)) {
      setError("Experience must be a whole number of years.");
      return;
    }
    const nextCategoryId = categoryId === "" ? null : Number(categoryId);
    saveMutation.mutate({
      name: name.trim() || undefined,
      city: city.trim() || undefined,
      experience: exp ? Number(exp) : undefined,
      description: description.trim() || undefined,
      // Only send when it actually changed — sending it re-points the partner
      // to a representative service of the category on the backend.
      categoryId:
        nextCategoryId != null && nextCategoryId !== partner.categoryId
          ? nextCategoryId
          : undefined,
    });
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Avatar partner={partner} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {partner.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {partner.service ?? partner.category ?? "Service partner"} · Joined{" "}
              {new Date(partner.joinedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Block toggle */}
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              partner.isBlocked ? "text-danger" : "text-muted-foreground"
            }`}
          >
            {partner.isBlocked ? "Blocked" : "Active"}
          </span>
          <button
            role="switch"
            aria-checked={partner.isBlocked}
            disabled={blockMutation.isPending}
            onClick={() => blockMutation.mutate(!partner.isBlocked)}
            title={partner.isBlocked ? "Unblock partner" : "Block partner"}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
              partner.isBlocked ? "bg-danger" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                partner.isBlocked ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {notice ? (
        <div className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success">{notice}</div>
      ) : null}
      {error ? (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Editable form */}
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-2xl border border-border bg-card p-5 lg:col-span-2"
        >
          <h2 className="text-base font-semibold text-foreground">Profile details</h2>
          <Field label="Name" value={name} onChange={setName} />
          <Field label="City" value={city} onChange={setCity} />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
            >
              <option value="">Unassigned</option>
              {categoryOptions.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Reassigning moves the partner to the selected service category.
            </p>
          </div>

          <Field
            label="Experience (years)"
            value={experience}
            onChange={setExperience}
            inputMode="numeric"
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {saveMutation.isPending ? <SpinnerIcon className="h-4 w-4" /> : null}
              Save changes
            </button>
          </div>
        </form>

        {/* Read-only info + danger zone */}
        <div className="space-y-6">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-foreground">Account</h2>
            <Info label="Email" value={partner.email ?? "—"} />
            <Info label="Mobile" value={partner.mobile ?? "—"} />
            <Info label="Category" value={partner.category ?? "—"} />
            <Info
              label="Rating"
              value={
                <span className="inline-flex items-center gap-1">
                  <StarIcon className="h-3.5 w-3.5 text-warning" />
                  {partner.rating.toFixed(1)}
                </span>
              }
            />
            <Info label="Total jobs" value={String(partner.totalJobs)} />
            <Info label="Wallet balance" value={`₹${Math.round(partner.walletBalance).toLocaleString("en-IN")}`} />
            <Info label="Verified" value={partner.isVerified ? "Yes" : "No"} />
          </div>

          <div className="space-y-3 rounded-2xl border border-danger/30 bg-card p-5">
            <h2 className="text-base font-semibold text-danger">Danger zone</h2>
            <p className="text-sm text-muted-foreground">
              Permanently delete this partner and erase all their data. This cannot be undone.
            </p>
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Delete partner permanently
            </button>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          danger
          title="Permanently delete this partner?"
          confirmLabel="Delete everything"
          busy={deleteMutation.isPending}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => deleteMutation.mutate()}
          message={
            <>
              This will permanently delete <strong className="text-foreground">{partner.name}</strong>{" "}
              and erase <strong className="text-foreground">all associated data</strong> — profile,
              bookings, wallet &amp; transactions, ratings, availability and subscriptions. This action
              is irreversible.
            </>
          }
        />
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "numeric";
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function Avatar({ partner }: { partner: PartnerDetail }) {
  if (partner.profileImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external partner image
      <img
        src={partner.profileImage}
        alt={partner.name}
        className="h-14 w-14 shrink-0 rounded-full object-cover"
      />
    );
  }
  const initials = partner.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-base font-semibold text-white">
      {initials || "?"}
    </div>
  );
}
