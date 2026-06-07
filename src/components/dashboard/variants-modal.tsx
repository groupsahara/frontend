"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { serviceApi, type CatalogService } from "@/src/api/api";
import { CloseIcon, PlusIcon, SpinnerIcon, TrashIcon } from "@/src/components/icons";

interface VariantsModalProps {
  service: CatalogService;
  onClose: () => void;
}

export function VariantsModal({ service, onClose }: VariantsModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["service", service.serviceId, "variants"],
    queryFn: () => serviceApi.listVariants(service.serviceId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["service", service.serviceId, "variants"] });
    queryClient.invalidateQueries({ queryKey: ["services"] });
  };

  const addMutation = useMutation({
    mutationFn: () =>
      serviceApi.addVariant(service.serviceId, {
        name: name.trim(),
        price: Number(price) || 0,
      }),
    onSuccess: () => {
      setName("");
      setPrice("");
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (variantId: number) => serviceApi.removeVariant(variantId),
    onSuccess: invalidate,
  });

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addMutation.mutate();
  };

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Add-ons</h2>
            <p className="text-sm text-muted-foreground">{service.name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <form onSubmit={handleAdd} className="flex items-end gap-2">
            <label className="flex-1 space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Premium"
                className={inputClass}
              />
            </label>
            <label className="w-28 space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Price</span>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1499"
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {addMutation.isPending ? (
                <SpinnerIcon className="h-4 w-4" />
              ) : (
                <PlusIcon className="h-4 w-4" />
              )}
              Add
            </button>
          </form>

          <div className="divide-y divide-border rounded-lg border border-border">
            {isLoading ? (
              <div className="flex h-24 items-center justify-center text-muted-foreground">
                <SpinnerIcon className="h-5 w-5" />
              </div>
            ) : data && data.variants.length > 0 ? (
              data.variants.map((v) => (
                <div key={v.variantId} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{v.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ₹{v.price.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(v.variantId)}
                    disabled={deleteMutation.isPending}
                    aria-label="Delete add-on"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No add-ons yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
