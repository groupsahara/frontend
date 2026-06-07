"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys, storefrontApi, type StorefrontCategory } from "@/src/api/api";
import { SpinnerIcon } from "@/src/components/icons";

interface PopularCategoriesProps {
  selectedCategoryId: number | null;
  onSelect: (categoryId: number | null) => void;
}

/** Images for the right-hand collage (Urban Company–style hero imagery). */
const COLLAGE = [
  "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=600&q=80&auto=format&fit=crop",
];

export function PopularCategories({
  selectedCategoryId,
  onSelect,
}: PopularCategoriesProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.storefrontCategories,
    queryFn: () => storefrontApi.categories(),
  });

  const categories = data?.categories ?? [];

  return (
    <section id="categories" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          POPULAR CATEGORIES
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-500 sm:text-base">
          Choose your service category and connect with top-rated professionals near you.
        </p>
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* LEFT — category card */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          {selectedCategoryId !== null && (
            <button
              onClick={() => onSelect(null)}
              className="mb-4 text-sm font-medium text-gray-900 underline"
            >
              ← Clear filter
            </button>
          )}

          {isLoading ? (
            <div className="flex h-72 items-center justify-center text-gray-400">
              <SpinnerIcon className="h-6 w-6" />
            </div>
          ) : isError ? (
            <p className="py-20 text-center text-sm text-gray-500">
              Couldn’t load categories.
            </p>
          ) : categories.length === 0 ? (
            <p className="py-20 text-center text-sm text-gray-500">No categories yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4">
              {categories.map((category) => (
                <CategoryTile
                  key={category.categoryId}
                  category={category}
                  active={selectedCategoryId === category.categoryId}
                  onClick={() =>
                    onSelect(
                      selectedCategoryId === category.categoryId
                        ? null
                        : category.categoryId,
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — image collage covering the space */}
        <div className="hidden grid-cols-2 gap-4 lg:grid">
          <div className="space-y-4">
            <CollageImage src={COLLAGE[0]} className="h-2/3" />
            <CollageImage src={COLLAGE[2]} className="h-1/3" />
          </div>
          <div className="space-y-4 pt-10">
            <CollageImage src={COLLAGE[1]} className="h-1/3" />
            <CollageImage src={COLLAGE[3]} className="h-2/3" />
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryTile({
  category,
  active,
  onClick,
}: {
  category: StorefrontCategory;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-2 text-center">
      <div
        className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border bg-gray-50 transition ${
          active
            ? "border-gray-900 ring-2 ring-gray-900/10"
            : "border-transparent group-hover:border-gray-200 group-hover:shadow-sm"
        }`}
      >
        {category.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- external category images
          <img
            src={category.profileImage}
            alt={category.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-2xl font-semibold text-gray-300">
            {category.name.charAt(0)}
          </span>
        )}

        {category.vendorCount > 0 && (
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-md border border-gray-100 bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 shadow-sm">
            {category.vendorCount} {category.vendorCount === 1 ? "vendor" : "vendors"}
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-xs font-medium leading-tight text-gray-800">
        {category.name}
      </p>
    </button>
  );
}

function CollageImage({ src, className }: { src: string; className?: string }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 ${className ?? ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- external stock imagery */}
      <img src={src} alt="" className="h-full w-full object-cover" />
    </div>
  );
}
