"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  dispatchApi,
  dispatcherApi,
  queryKeys,
  type GeofenceDetail,
  type GeofenceInput,
  type LatLng,
  type PartnerRow,
} from "@/src/api/api";
import { ApiError } from "@/src/api/apiClient";
import { GeofenceMapEditor, type FenceOverlay } from "@/src/components/dashboard/dispatch-map";
import { SearchIcon, SpinnerIcon } from "@/src/components/icons";

const ZONE_COLORS = ["#6366f1", "#ef4444", "#f59e0b", "#10b981", "#0ea5e9", "#d946ef"];

/** Approximate polygon area in km² (shoelace over locally-flattened coords). */
function polygonAreaKm2(points: LatLng[]): number {
  if (points.length < 3) return 0;
  const midLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const kmPerLat = 110.574;
  const kmPerLng = 111.32 * Math.cos((midLat * Math.PI) / 180);
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.lng * kmPerLng * (b.lat * kmPerLat) - b.lng * kmPerLng * (a.lat * kmPerLat);
  }
  return Math.abs(area / 2);
}

/**
 * Shared create/edit form for a geofence: details + team + partner assignment
 * on the left, the polygon map editor on the right.
 */
export function GeofenceEditor({ initial }: { initial: GeofenceDetail | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? ZONE_COLORS[0]);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [teamId, setTeamId] = useState<number | null>(initial?.teamId ?? null);
  const [polygon, setPolygon] = useState<LatLng[]>(initial?.polygon ?? []);
  const [selectedPartners, setSelectedPartners] = useState<Set<number>>(
    () => new Set(initial?.partners.map((p) => p.professionalId) ?? []),
  );
  const [partnerSearch, setPartnerSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const { data: teams } = useQuery({
    queryKey: queryKeys.dispatchTeams(""),
    queryFn: () => dispatchApi.listTeams(),
  });

  // Active partners only — the operational pool a zone can be assigned to.
  const { data: partners, isLoading: partnersLoading } = useQuery({
    queryKey: queryKeys.partners("", "ACTIVE"),
    queryFn: () => dispatcherApi.listPartners(undefined, "ACTIVE"),
  });

  // Other zones render on the map for context so new zones can be drawn
  // relative to existing coverage.
  const { data: allFences } = useQuery({
    queryKey: queryKeys.geofences(""),
    queryFn: () => dispatchApi.listGeofences(),
  });
  const otherFences: FenceOverlay[] = useMemo(
    () =>
      (allFences ?? [])
        .filter((f) => f.geofenceId !== initial?.geofenceId)
        .map((f) => ({ name: f.name, color: f.color, polygon: f.polygon })),
    [allFences, initial?.geofenceId],
  );

  const teamNameById = useMemo(
    () => new Map((teams ?? []).map((t) => [t.teamId, t.name])),
    [teams],
  );

  const visiblePartners = useMemo(() => {
    const q = partnerSearch.trim().toLowerCase();
    const list = partners ?? [];
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.city ?? "").toLowerCase().includes(q) ||
        (p.mobile ?? "").includes(q),
    );
  }, [partners, partnerSearch]);

  const allVisibleSelected =
    visiblePartners.length > 0 &&
    visiblePartners.every((p) => selectedPartners.has(p.professionalId));

  const toggleAllVisible = () => {
    setSelectedPartners((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visiblePartners.forEach((p) => next.delete(p.professionalId));
      else visiblePartners.forEach((p) => next.add(p.professionalId));
      return next;
    });
  };

  const togglePartner = (id: number) => {
    setSelectedPartners((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: (body: GeofenceInput) =>
      initial
        ? dispatchApi.updateGeofence(initial.geofenceId, body)
        : dispatchApi.createGeofence(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatcher", "geofences"] });
      if (initial) {
        queryClient.invalidateQueries({ queryKey: queryKeys.geofence(initial.geofenceId) });
      }
      router.push("/dashboard/dispatcher/geo-fence");
    },
    onError: (e) =>
      setNotice(e instanceof ApiError ? e.message : "Could not save the geofence."),
  });

  const canSave = name.trim().length >= 2 && polygon.length >= 3 && !saveMutation.isPending;

  const save = () => {
    saveMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      polygon,
      teamId,
      partnerIds: [...selectedPartners],
      isActive,
    });
  };

  const areaKm2 = polygonAreaKm2(polygon);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/dispatcher/geo-fence"
            className="text-sm font-medium text-muted-foreground transition hover:text-primary"
          >
            ← Back to Geo Fence
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {initial ? `Edit “${initial.name}”` : "Add Geofence"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/dispatcher/geo-fence"
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {saveMutation.isPending ? <SpinnerIcon className="h-4 w-4" /> : null}
            {initial ? "Save Changes" : "Create Geofence"}
          </button>
        </div>
      </div>

      {notice ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="hover:opacity-70">
            ✕
          </button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Left: details + assignment */}
        <div className="space-y-5">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ABC Deliveries"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Description <span className="font-normal text-muted-foreground">(Optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Team</label>
              <select
                value={teamId ?? ""}
                onChange={(e) => setTeamId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
              >
                <option value="">No team</option>
                {(teams ?? []).map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-foreground">Zone colour</span>
              <div className="flex items-center gap-2">
                {ZONE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Zone colour ${c}`}
                    className={`h-7 w-7 rounded-full transition ${
                      color === c ? "ring-2 ring-ring ring-offset-2 ring-offset-card" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between">
              <span className="text-sm font-medium text-foreground">Active</span>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((v) => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
                  isActive ? "bg-success" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                    isActive ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Partner assignment */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                />
                Select All Service Partner
              </label>
              <span className="shrink-0 text-xs text-muted-foreground">
                {selectedPartners.size} selected
              </span>
            </div>

            <div className="relative mb-3">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.target.value)}
                placeholder="Search"
                className="w-full rounded-xl border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {partnersLoading ? (
                <div className="flex h-24 items-center justify-center text-muted-foreground">
                  <SpinnerIcon className="h-5 w-5" />
                </div>
              ) : visiblePartners.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {partnerSearch ? "No partners match your search." : "No active partners yet."}
                </p>
              ) : (
                visiblePartners.map((p) => (
                  <PartnerPickRow
                    key={p.professionalId}
                    partner={p}
                    teamName={p.teamId != null ? teamNameById.get(p.teamId) : undefined}
                    checked={selectedPartners.has(p.professionalId)}
                    onToggle={() => togglePartner(p.professionalId)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: map */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Click the map to add points · drag a point to adjust · right-click a point to remove
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {polygon.length} point{polygon.length === 1 ? "" : "s"}
                {areaKm2 > 0 ? ` · ~${areaKm2 < 10 ? areaKm2.toFixed(1) : Math.round(areaKm2)} km²` : ""}
              </span>
              <button
                type="button"
                onClick={() => setPolygon((p) => p.slice(0, -1))}
                disabled={polygon.length === 0}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent disabled:opacity-50"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={() => setPolygon([])}
                disabled={polygon.length === 0}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border">
            <GeofenceMapEditor
              polygon={polygon}
              onChange={setPolygon}
              color={color}
              otherFences={otherFences}
            />
          </div>
          {polygon.length < 3 && (
            <p className="text-xs text-muted-foreground">
              Add at least 3 points to form a zone before saving.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PartnerPickRow({
  partner,
  teamName,
  checked,
  onToggle,
}: {
  partner: PartnerRow;
  teamName?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const initials = partner.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 transition hover:border-primary/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 rounded border-border accent-[var(--primary)]"
      />
      {partner.profileImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- external partner image
        <img
          src={partner.profileImage}
          alt={partner.name}
          className="h-8 w-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-semibold text-white">
          {initials || "?"}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{partner.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {teamName ?? "No Team Alloted"}
          {partner.city ? ` · ${partner.city}` : ""}
        </span>
      </span>
      {partner.isOnline && (
        <span className="h-2 w-2 shrink-0 rounded-full bg-success" title="Online" />
      )}
    </label>
  );
}
