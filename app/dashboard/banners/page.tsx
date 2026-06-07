"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BANNER_SPEC, bannerApi, queryKeys, type Banner } from "@/src/api/api";
import { BannerForm } from "@/src/components/dashboard/banner-form";
import { ImageIcon, PencilIcon, PlusIcon, SpinnerIcon, TrashIcon } from "@/src/components/icons";

export default function BannersPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.banners,
    queryFn: () => bannerApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => bannerApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.banners });
      queryClient.invalidateQueries({ queryKey: queryKeys.bannersActive });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (banner: Banner) =>
      bannerApi.update(banner.bannerId, { isActive: !banner.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.banners });
      queryClient.invalidateQueries({ queryKey: queryKeys.bannersActive });
    },
  });

  const banners = data ?? [];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (banner: Banner) => {
    setEditing(banner);
    setFormOpen(true);
  };
  const handleDelete = (banner: Banner) => {
    if (confirm("Delete this banner? This cannot be undone.")) {
      deleteMutation.mutate(banner.bannerId);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Banner</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage the homepage hero banners. Recommended size {BANNER_SPEC.label}.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <PlusIcon className="h-4 w-4" />
          Add Banner
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-60 items-center justify-center text-muted-foreground">
          <SpinnerIcon className="h-6 w-6" />
        </div>
      ) : isError ? (
        <div className="flex h-60 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card text-center">
          <p className="text-muted-foreground">Couldn’t load banners.</p>
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Retry
          </button>
        </div>
      ) : banners.length === 0 ? (
        <div className="flex h-60 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card text-center">
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No banners yet.</p>
          <button
            onClick={openCreate}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Add your first banner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {banners.map((banner) => (
            <div
              key={banner.bannerId}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="relative aspect-[3/1] w-full bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- external banner image */}
                <img
                  src={banner.imageUrl}
                  alt={banner.title ?? "Banner"}
                  className="h-full w-full object-cover"
                />
                <span
                  className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium ${
                    banner.isActive
                      ? "bg-success/15 text-success"
                      : "bg-black/50 text-white"
                  }`}
                >
                  {banner.isActive ? "Active" : "Hidden"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {banner.title || "Untitled banner"}
                  </p>
                  {banner.subtitle && (
                    <p className="truncate text-sm text-muted-foreground">{banner.subtitle}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">Order: {banner.sortOrder}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggleMutation.mutate(banner)}
                    disabled={toggleMutation.isPending}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
                  >
                    {banner.isActive ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => openEdit(banner)}
                    aria-label="Edit banner"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-accent hover:text-primary"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(banner)}
                    disabled={deleteMutation.isPending}
                    aria-label="Delete banner"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && <BannerForm banner={editing} onClose={() => setFormOpen(false)} />}
    </div>
  );
}
