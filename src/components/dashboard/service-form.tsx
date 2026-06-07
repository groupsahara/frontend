"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  categoryApi,
  queryKeys,
  serviceApi,
  type CatalogService,
  type ServiceInput,
  type ServiceVariantInput,
} from "@/src/api/api";
import { ApiError } from "@/src/api/apiClient";
import { CloseIcon, SpinnerIcon } from "@/src/components/icons";

const VARIANTS_PLACEHOLDER = `[
  { "name": "north Indian chef", "price": 299, "durationMinutes": 60 },
  { "name": "north Indian chef", "price": 499, "durationMinutes": 60 }
]`;

/** Parse the variants JSON textarea into validated ServiceVariantInput[]. */
function parseVariantsJson(raw: string): ServiceVariantInput[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON — check for missing commas, quotes or brackets.");
  }
  if (!Array.isArray(data)) {
    throw new Error('Variants must be a JSON array, e.g. [{ "name": "...", "price": 299 }]');
  }
  return data.map((item, i) => {
    const pos = `Item ${i + 1}`;
    if (!item || typeof item !== "object") {
      throw new Error(`${pos}: each variant must be an object.`);
    }
    const v = item as Record<string, unknown>;
    const name = typeof v.name === "string" ? v.name.trim() : "";
    if (!name) throw new Error(`${pos}: "name" is required.`);
    const price = Number(v.price);
    if (!Number.isFinite(price)) throw new Error(`${pos}: "price" must be a number.`);
    const variant: ServiceVariantInput = { name, price };
    if (v.durationMinutes != null && v.durationMinutes !== "") {
      const duration = Number(v.durationMinutes);
      if (!Number.isFinite(duration)) {
        throw new Error(`${pos}: "durationMinutes" must be a number.`);
      }
      variant.durationMinutes = Math.round(duration);
    }
    return variant;
  });
}

interface ServiceFormProps {
  /** Optional — services created from a category page have no vendor. */
  vendorId?: number;
  defaultCategoryId?: number | null;
  service: CatalogService | null; // null => create
  onClose: () => void;
}

export function ServiceForm({ vendorId, defaultCategoryId, service, onClose }: ServiceFormProps) {
  const isEdit = Boolean(service);
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: queryKeys.categories,
    queryFn: categoryApi.list,
  });

  const [name, setName] = useState(service?.name ?? "");
  const [categoryId, setCategoryId] = useState<number | "">(
    service?.categoryId ?? defaultCategoryId ?? "",
  );
  const [basePrice, setBasePrice] = useState<string>(
    service?.basePrice != null ? String(service.basePrice) : "",
  );
  const [description, setDescription] = useState(service?.description ?? "");
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(service?.isFeatured ?? false);
  const [variantsJson, setVariantsJson] = useState("");
  const [variantError, setVariantError] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: async (parsedVariants?: ServiceVariantInput[]) => {
      const payload: ServiceInput = {
        name: name.trim(),
        categoryId: Number(categoryId),
        vendorId,
        description: description.trim() || undefined,
        basePrice: basePrice ? Number(basePrice) : undefined,
        isActive,
        isFeatured,
        variants: !isEdit && parsedVariants?.length ? parsedVariants : undefined,
      };
      const saved = service
        ? await serviceApi.update(service.serviceId, payload)
        : await serviceApi.create(payload);
      // Upload the image (if chosen) against the saved service id.
      if (image) {
        await serviceApi.uploadImage(saved.serviceId, image);
      }
      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.categoryTree });
      if (vendorId != null) {
        queryClient.invalidateQueries({ queryKey: ["vendor", vendorId] });
      }
      onClose();
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;

    setVariantError(null);
    let parsedVariants: ServiceVariantInput[] | undefined;

    if (!isEdit && variantsJson.trim()) {
      try {
        parsedVariants = parseVariantsJson(variantsJson);
      } catch (err) {
        setVariantError(err instanceof Error ? err.message : "Invalid variants JSON");
        return;
      }
    }

    mutation.mutate(parsedVariants);
  };

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? "Something went wrong."
        : null;

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {isEdit ? "Edit service" : "Add service"}
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
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-muted-foreground">Service name *</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Chinese Chef"
              className={inputClass}
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-muted-foreground">Category *</span>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                className={inputClass}
              >
                <option value="">Select category</option>
                {categories?.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-muted-foreground">Price (₹)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="1199"
                className={inputClass}
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-muted-foreground">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Short description"
              className={inputClass}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-muted-foreground">
              Image{" "}
              {isEdit && service?.profileImage && (
                <span className="font-normal text-muted-foreground">
                  (leave empty to keep current)
                </span>
              )}
            </span>
            <div className="flex items-center gap-3">
              {(image || service?.profileImage) && (
                // eslint-disable-next-line @next/next/no-img-element -- local preview / external URL
                <img
                  src={image ? URL.createObjectURL(image) : (service?.profileImage ?? "")}
                  alt="Service preview"
                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:text-foreground`}
              />
            </div>
          </label>

          <div className="flex flex-wrap gap-5">
            <Toggle label="Published" checked={isActive} onChange={setIsActive} />
            <Toggle label="Featured" checked={isFeatured} onChange={setIsFeatured} />
          </div>

          {!isEdit && (
            <label className="block space-y-1.5 rounded-lg border border-border p-3">
              <span className="text-sm font-medium text-foreground">
                Variants / Add-ons{" "}
                <span className="font-normal text-muted-foreground">(JSON, optional)</span>
              </span>
              <textarea
                value={variantsJson}
                onChange={(e) => setVariantsJson(e.target.value)}
                rows={7}
                spellCheck={false}
                placeholder={VARIANTS_PLACEHOLDER}
                className={`${inputClass} font-mono text-xs`}
              />
              <span className="block text-xs text-muted-foreground">
                Paste an array of{" "}
                <code className="rounded bg-muted px-1">
                  {'{ "name", "price", "durationMinutes?" }'}
                </code>{" "}
                objects. <code className="rounded bg-muted px-1">durationMinutes</code> is
                optional.
              </span>
              {variantError && <span className="block text-xs text-danger">{variantError}</span>}
            </label>
          )}

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
              {isEdit ? "Save changes" : "Create service"}
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
