"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BANNER_SPECS,
  bannerApi,
  queryKeys,
  type Banner,
  type BannerPlatform,
} from "@/src/api/api";
import { ApiError } from "@/src/api/apiClient";
import { compressImage } from "@/src/lib/image";
import { CloseIcon, SpinnerIcon } from "@/src/components/icons";

interface BannerFormProps {
  banner: Banner | null; // null => create
  /** Platform pre-selected when creating a new banner (defaults to WEB). */
  defaultPlatform?: BannerPlatform;
  onClose: () => void;
}

/** Read an image File's pixel dimensions. */
function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the image."));
    };
    img.src = url;
  });
}

export function BannerForm({ banner, defaultPlatform = "WEB", onClose }: BannerFormProps) {
  const isEdit = Boolean(banner);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(banner?.title ?? "");
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? "");
  const [linkUrl, setLinkUrl] = useState(banner?.linkUrl ?? "");
  const [isActive, setIsActive] = useState(banner?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState<string>(String(banner?.sortOrder ?? 0));
  const [platform, setPlatform] = useState<BannerPlatform>(
    banner?.platform ?? defaultPlatform,
  );
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Recommended size + validation thresholds depend on the chosen platform.
  const spec = BANNER_SPECS[platform];

  const mutation = useMutation({
    mutationFn: async () => {
      // Downscale + compress before upload so large images don't hit the live
      // API's ~1 MB nginx body cap (which surfaces as "Unable to reach server").
      const compressed = image
        ? await compressImage(image, { maxWidth: spec.width, maxBytes: 800_000 })
        : null;

      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        linkUrl: linkUrl.trim(),
        isActive,
        sortOrder: Number(sortOrder) || 0,
        platform,
        image: compressed,
      };
      return banner ? bannerApi.update(banner.bannerId, payload) : bannerApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.banners });
      queryClient.invalidateQueries({ queryKey: queryKeys.bannersActive });
      onClose();
    },
  });

  const handleFile = async (file: File | null) => {
    setImageError(null);
    setImage(null);
    if (!file) return;

    if (file.size > spec.maxBytes) {
      setImageError(
        `Image is ${(file.size / 1024 / 1024).toFixed(1)} MB — max is ${(
          spec.maxBytes / 1024 / 1024
        ).toFixed(0)} MB.`,
      );
      return;
    }

    try {
      const { width, height } = await readImageSize(file);
      if (width < spec.minWidth) {
        setImageError(
          `Image is ${width}×${height}px — too small. Use at least ${spec.minWidth}px wide (recommended ${spec.width}×${spec.height}).`,
        );
        return;
      }
      setImage(file);
    } catch {
      setImageError("Could not read the image. Try a different file.");
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (imageError) return;
    if (!isEdit && !image) {
      setImageError("A banner image is required.");
      return;
    }
    mutation.mutate();
  };

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? "Something went wrong."
        : null;

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30";

  const previewSrc = image ? URL.createObjectURL(image) : (banner?.imageUrl ?? null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? "Edit banner" : "Add banner"}
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
          {/* Platform: web storefront vs mobile app */}
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-muted-foreground">Banner for</span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "WEB" as const, label: "🖥️ Web", hint: BANNER_SPECS.WEB.label },
                  { value: "MOBILE" as const, label: "📱 Mobile", hint: BANNER_SPECS.MOBILE.label },
                ]
              ).map((opt) => {
                const active = platform === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setPlatform(opt.value);
                      setImageError(null);
                    }}
                    className={`rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-primary bg-primary/5 ring-2 ring-ring/30"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-foreground">{opt.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Image + size guidance */}
          <div className="space-y-2 rounded-xl border border-border bg-background/40 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Banner image {isEdit ? "" : "*"}
              </span>
              <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                Recommended: {spec.label}
              </span>
            </div>

            {previewSrc && (
              <div className="overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview / external URL */}
                <img
                  src={previewSrc}
                  alt="Banner preview"
                  style={{ aspectRatio: platform === "MOBILE" ? "2 / 1" : "3 / 1" }}
                  className="w-full object-cover"
                />
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:text-foreground`}
            />
            <p className="text-xs text-muted-foreground">
              {platform === "MOBILE"
                ? `Mobile app banner — use a ${spec.aspect} image (recommended ${spec.width}×${spec.height}px).`
                : `Wide landscape works best — ${spec.aspect} (recommended ${spec.width}×${spec.height}px).`}{" "}
              Max file size {(spec.maxBytes / 1024 / 1024).toFixed(0)} MB.
            </p>
            {imageError && <p className="text-xs text-danger">{imageError}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-muted-foreground">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Restaurant Staffing solutions at your doorstep"
                className={inputClass}
              />
            </label>
            <label className="block space-y-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-muted-foreground">Subtitle</span>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Book trusted professionals near you"
                className={inputClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-muted-foreground">Link URL</span>
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://…"
                className={inputClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-muted-foreground">Sort order</span>
              <input
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <Toggle label="Active" checked={isActive} onChange={setIsActive} />

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
              {isEdit ? "Save changes" : "Create banner"}
            </button>
          </div>
        </form>
      </div>
    </div>
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
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2">
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
