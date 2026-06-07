"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys, storefrontApi, type StorefrontVendor } from "@/src/api/api";
import { MapPinIcon, SpinnerIcon, StarIcon, StoreIcon } from "@/src/components/icons";

interface VendorGridProps {
  search: string;
  categoryId: number | null;
}

export function VendorGrid({ search, categoryId }: VendorGridProps) {
  const params = {
    search: search.trim() || undefined,
    categoryId: categoryId ?? undefined,
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.storefrontVendors(params),
    queryFn: () => storefrontApi.vendors(params),
  });

  const vendors = data?.vendors ?? [];

  return (
    <section id="vendors" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            Top vendors near you Book Your Professional
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {vendors.length > 0
              ? `${vendors.length} ${vendors.length === 1 ? "vendor" : "vendors"} available`
              : "Browse our verified service vendors"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-gray-400">
          <SpinnerIcon className="h-6 w-6" />
        </div>
      ) : isError ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
          <p className="text-gray-500">Couldn’t load vendors.</p>
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      ) : vendors.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 text-center">
          <StoreIcon className="h-10 w-10 text-gray-300" />
          <p className="text-gray-500">
            No vendors match your search yet. New vendors appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {vendors.map((vendor) => (
            <VendorCard key={vendor.vendorId} vendor={vendor} />
          ))}
        </div>
      )}
    </section>
  );
}

function VendorCard({ vendor }: { vendor: StorefrontVendor }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
        {vendor.icon ? (
          // eslint-disable-next-line @next/next/no-img-element -- external vendor icons
          <img
            src={vendor.icon}
            alt={vendor.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-4xl font-bold text-gray-300">{vendor.name.charAt(0)}</span>
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium ${
            vendor.isOpen
              ? "bg-green-100 text-green-700"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {vendor.isOpen ? "Open now" : "Closed"}
        </span>
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-semibold text-gray-900">{vendor.name}</h3>
          <span className="flex shrink-0 items-center gap-1 rounded-md bg-green-600 px-1.5 py-0.5 text-xs font-semibold text-white">
            <StarIcon className="h-3 w-3" />
            4.8
          </span>
        </div>

        {vendor.category && (
          <p className="text-xs font-medium text-gray-500">{vendor.category.name}</p>
        )}

        {(vendor.address || vendor.city) && (
          <p className="flex items-center gap-1 text-xs text-gray-500">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{vendor.address || vendor.city}</span>
          </p>
        )}

        <div className="flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-sm font-semibold text-gray-900">
            {vendor.servicesCount} {vendor.servicesCount === 1 ? "service" : "services"}
          </span>
          <span className="text-xs font-medium text-gray-900 group-hover:underline">
            View →
          </span>
        </div>
      </div>
    </article>
  );
}
