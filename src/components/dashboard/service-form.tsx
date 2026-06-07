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
import { CloseIcon, PlusIcon, SpinnerIcon, TrashIcon } from "@/src/components/icons";

interface ServiceFormProps {
  vendorId: number;
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
  const [variants, setVariants] = useState<ServiceVariantInput[]>([]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: ServiceInput = {
        name: name.trim(),
        categoryId: Number(categoryId),
        vendorId,
        description: description.trim() || undefined,
        basePrice: basePrice ? Number(basePrice) : undefined,
        isActive,
        isFeatured,
        variants:
          !isEdit && variants.length
            ? variants
                .filter((v) => v.name.trim())
                .map((v) => ({ name: v.name.trim(), price: Number(v.price) || 0 }))
            : undefined,
      };
      return service
        ? serviceApi.update(service.serviceId, payload)
        : serviceApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["vendor", vendorId] });
      onClose();
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!categoryId) return;
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

          <div className="flex flex-wrap gap-5">
            <Toggle label="Published" checked={isActive} onChange={setIsActive} />
            <Toggle label="Featured" checked={isFeatured} onChange={setIsFeatured} />
          </div>

          {!isEdit && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Variants / Add-ons</span>
                <button
                  type="button"
                  onClick={() => setVariants((v) => [...v, { name: "", price: 0 }])}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  <PlusIcon className="h-4 w-4" /> Add
                </button>
              </div>
              {variants.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Optional — e.g. Standard / Premium tiers.
                </p>
              )}
              {variants.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={v.name}
                    onChange={(e) =>
                      setVariants((arr) =>
                        arr.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)),
                      )
                    }
                    placeholder="Variant name"
                    className={inputClass}
                  />
                  <input
                    type="number"
                    min={0}
                    value={v.price}
                    onChange={(e) =>
                      setVariants((arr) =>
                        arr.map((x, idx) =>
                          idx === i ? { ...x, price: Number(e.target.value) } : x,
                        ),
                      )
                    }
                    placeholder="Price"
                    className={`${inputClass} max-w-28`}
                  />
                  <button
                    type="button"
                    onClick={() => setVariants((arr) => arr.filter((_, idx) => idx !== i))}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-danger/10 hover:text-danger"
                    aria-label="Remove variant"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
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
