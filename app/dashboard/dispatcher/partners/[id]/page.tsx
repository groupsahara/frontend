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
  type PartnerOnboardingStatus,
  type UpdatePartnerInput,
} from "@/src/api/api";
import { ApiError } from "@/src/api/apiClient";
import { ConfirmDialog } from "@/src/components/dashboard/confirm-dialog";
import {
  ONBOARDING_STATUS_META,
  PartnerStatusBadge,
} from "@/src/components/dashboard/partner-status";
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
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

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

  const onboardingMutation = useMutation({
    mutationFn: ({ status, reason }: { status: PartnerOnboardingStatus; reason?: string }) =>
      dispatcherApi.setPartnerOnboarding(partner.professionalId, status, reason),
    onSuccess: (res) => {
      setError(null);
      setNotice(res.message);
      setRejectOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.partnerStatusCounts });
      invalidate();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not update onboarding status."),
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
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {partner.name}
              </h1>
              <PartnerStatusBadge status={partner.onboardingStatus} />
            </div>
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

      <OnboardingReview
        partner={partner}
        busy={onboardingMutation.isPending}
        onTransition={(status, reason) => onboardingMutation.mutate({ status, reason })}
        onReject={() => {
          setRejectReason(partner.rejectionReason ?? "");
          setRejectOpen(true);
        }}
      />

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
            <Info
              label="Onboarding"
              value={ONBOARDING_STATUS_META[partner.onboardingStatus].label}
            />
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

      {rejectOpen && (
        <RejectDialog
          busy={onboardingMutation.isPending}
          reason={rejectReason}
          onReasonChange={setRejectReason}
          onCancel={() => setRejectOpen(false)}
          onConfirm={() =>
            onboardingMutation.mutate({ status: "REJECTED", reason: rejectReason.trim() || undefined })
          }
        />
      )}
    </>
  );
}

// Onboarding review — the KYC documents plus the verify → activate / reject
// controls. This is where the admin walks a pending partner through approval.
function OnboardingReview({
  partner,
  busy,
  onTransition,
  onReject,
}: {
  partner: PartnerDetail;
  busy: boolean;
  onTransition: (status: PartnerOnboardingStatus, reason?: string) => void;
  onReject: () => void;
}) {
  const status = partner.onboardingStatus;
  const meta = ONBOARDING_STATUS_META[status];

  const docs: { label: string; url: string | null }[] = [
    { label: "Aadhaar front", url: partner.documents.aadharFront },
    { label: "Aadhaar back", url: partner.documents.aadharBack },
    { label: "Driving licence", url: partner.documents.licenseDoc },
    { label: "PAN card", url: partner.documents.panCard },
    { label: "Bank passbook", url: partner.documents.bankPassbook },
  ];
  const uploaded = docs.filter((d) => d.url);

  const grooming: { label: string; url: string | null }[] = [
    { label: "Passport size", url: partner.grooming.passportPhoto },
    { label: "Hands & nails", url: partner.grooming.nailsPhoto },
    { label: "Full size", url: partner.grooming.fullPhoto },
  ];
  const groomingUploaded = grooming.filter((g) => g.url);

  const identity: { label: string; value: string | null }[] = [
    { label: "Aadhaar no.", value: partner.aadharNo },
    { label: "Licence no.", value: partner.licenseNo },
    { label: "Vehicle type", value: partner.vehicleType },
    { label: "Vehicle colour", value: partner.vehicleColor },
  ];
  const identityShown = identity.filter((i) => i.value);

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <section className={`space-y-5 rounded-2xl border bg-card p-5 ${meta.border}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Onboarding review</h2>
          <p className="text-sm text-muted-foreground">
            {status === "PENDING"
              ? "Review the documents below, then verify and activate this partner."
              : status === "VERIFIED"
                ? "Documents verified. Activate the partner so they can log in."
                : status === "ACTIVE"
                  ? "This partner is active and can log in."
                  : "This application was rejected."}
          </p>
        </div>
        <PartnerStatusBadge status={status} />
      </div>

      {/* Progress timeline */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>
          Applied ·{" "}
          <span className="font-medium text-foreground">
            {new Date(partner.joinedAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </span>
        {fmt(partner.verifiedAt) && (
          <span>
            Verified · <span className="font-medium text-foreground">{fmt(partner.verifiedAt)}</span>
          </span>
        )}
        {fmt(partner.activatedAt) && (
          <span>
            Activated ·{" "}
            <span className="font-medium text-foreground">{fmt(partner.activatedAt)}</span>
          </span>
        )}
      </div>

      {status === "REJECTED" && partner.rejectionReason && (
        <div className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          <span className="font-medium">Rejection reason:</span> {partner.rejectionReason}
        </div>
      )}

      {/* Identity details */}
      {identityShown.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {identityShown.map((i) => (
            <div key={i.label} className="rounded-xl border border-border bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">{i.label}</p>
              <p className="truncate text-sm font-medium text-foreground">{i.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* KYC documents */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          KYC documents{" "}
          <span className="font-normal text-muted-foreground">
            ({uploaded.length}/{docs.length} uploaded)
          </span>
        </p>
        {uploaded.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            This partner hasn’t uploaded any documents.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {docs.map((d) => (
              <DocumentTile key={d.label} label={d.label} url={d.url} />
            ))}
          </div>
        )}
      </div>

      {/* Grooming photos */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          Grooming photos{" "}
          <span className="font-normal text-muted-foreground">
            ({groomingUploaded.length}/{grooming.length} uploaded)
          </span>
        </p>
        {groomingUploaded.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            This partner hasn’t uploaded any grooming photos.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {grooming.map((g) => (
              <DocumentTile key={g.label} label={g.label} url={g.url} />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {(status === "PENDING" || status === "REJECTED") && (
          <button
            onClick={() => onTransition("VERIFIED")}
            disabled={busy}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            Verify documents
          </button>
        )}
        {status === "VERIFIED" && (
          <button
            onClick={() => onTransition("ACTIVE")}
            disabled={busy}
            className="rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Activate partner
          </button>
        )}
        {status === "ACTIVE" && (
          <button
            onClick={() => onTransition("PENDING")}
            disabled={busy}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent disabled:opacity-60"
          >
            Move back to review
          </button>
        )}
        {status !== "REJECTED" && (
          <button
            onClick={onReject}
            disabled={busy}
            className="rounded-xl border border-danger/40 px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-60"
          >
            Reject application
          </button>
        )}
        {busy && <SpinnerIcon className="h-4 w-4 text-muted-foreground" />}
      </div>
    </section>
  );
}

function DocumentTile({ label, url }: { label: string; url: string | null }) {
  if (!url) {
    return (
      <div className="flex flex-col overflow-hidden rounded-xl border border-dashed border-border">
        <div className="flex h-28 items-center justify-center bg-muted/40 text-xs text-muted-foreground">
          Not uploaded
        </div>
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-border transition hover:border-primary"
      title={`Open ${label}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- external KYC document */}
      <img src={url} alt={label} className="h-28 w-full object-cover" />
      <div className="px-2 py-1.5 text-xs font-medium text-foreground group-hover:text-primary">
        {label}
      </div>
    </a>
  );
}

function RejectDialog({
  busy,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  reason: string;
  onReasonChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-foreground">Reject this application?</h3>
        <p className="text-sm text-muted-foreground">
          The partner won’t be able to log in. The reason below is shown to them so they can fix and
          re-apply.
        </p>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={3}
          placeholder="e.g. Aadhaar photo is blurred, please re-upload."
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-danger focus:ring-2 focus:ring-danger/30"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {busy && <SpinnerIcon className="h-4 w-4" />}
            Reject partner
          </button>
        </div>
      </div>
    </div>
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
