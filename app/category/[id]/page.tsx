"use client";

import { Suspense, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  categoryTreeApi,
  queryKeys,
  type CategoryTreeNode,
  type CategoryTreeService,
} from "@/src/api/api";
import { LandingHeader } from "@/src/components/landing/landing-header";
import { Footer } from "@/src/components/landing/footer";
import { SpinnerIcon, StarIcon, ArrowRightIcon } from "@/src/components/icons";

/** A service flattened out of the category → group → service tree. */
interface FlatService extends CategoryTreeService {
  groupName: string | null;
}

/** Emoji fallback per category name when a service has no image. */
const EMOJI_BY_NAME: Record<string, string> = {
  chef: "👨‍🍳",
  plumber: "🚿",
  electrician: "💡",
  technician: "🛠️",
  "deep cleaning": "🧼",
  "helpers & waiter": "🧑‍🍳",
  "pest controll": "🐜",
  "pest control": "🐜",
  carpenter: "🔨",
};

function emojiFor(name: string): string {
  return EMOJI_BY_NAME[name.trim().toLowerCase()] ?? "🧰";
}

function formatPrice(price: number | null): string {
  if (price == null || price <= 0) return "On request";
  return `₹${price.toLocaleString("en-IN")}`;
}

export default function CategoryPage() {
  return (
    <Suspense fallback={null}>
      <CategoryPageContent />
    </Suspense>
  );
}

function CategoryPageContent() {
  const params = useParams<{ id: string }>();
  const categoryId = Number(params?.id);
  const searchParams = useSearchParams();

  // Pre-fill the filter when arriving from a service search (…/category/5?q=Tandoor).
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.categoryTree,
    queryFn: () => categoryTreeApi.tree(),
  });

  const category = useMemo<CategoryTreeNode | undefined>(
    () => data?.find((c) => c.categoryId === categoryId),
    [data, categoryId],
  );

  const services = useMemo<FlatService[]>(() => {
    if (!category) return [];
    return [
      ...category.services.map((s) => ({ ...s, groupName: null })),
      ...category.groups.flatMap((g) =>
        g.services.map((s) => ({ ...s, groupName: g.name })),
      ),
    ];
  }, [category]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q),
    );
  }, [services, search]);

  return (
    <div data-theme="light" className="min-h-dvh bg-gray-50">
      <LandingHeader search={search} onSearchChange={setSearch} />

      <main>
        {isLoading ? (
          <div className="flex h-[60vh] items-center justify-center text-gray-400">
            <SpinnerIcon className="h-7 w-7" />
          </div>
        ) : isError || (data && !category) ? (
          <div className="mx-auto flex h-[60vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
            <p className="text-5xl">🔍</p>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              {isError ? "Something went wrong" : "Category not found"}
            </h1>
            <p className="mt-2 text-gray-500">
              {isError
                ? "We couldn’t load this category. Please try again."
                : "The category you’re looking for doesn’t exist or was removed."}
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              ← Back to home
            </Link>
          </div>
        ) : category ? (
          <>
            {/* ===== Category banner ===== */}
            <section className="relative h-64 w-full overflow-hidden sm:h-80">
              {/* eslint-disable-next-line @next/next/no-img-element -- external category image */}
              <img
                src={category.profileImage}
                alt={category.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/30" />

              <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-8 sm:px-6">
                {/* breadcrumb */}
                <nav className="mb-3 flex items-center gap-2 text-sm text-white/80">
                  <Link href="/" className="hover:text-white">
                    Home
                  </Link>
                  <span>/</span>
                  <span className="font-medium text-white">{category.name}</span>
                </nav>

                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {category.name}
                </h1>
                {category.description ? (
                  <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
                    {category.description}
                  </p>
                ) : null}
                <p className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  {services.length} {services.length === 1 ? "service" : "services"} available
                </p>
              </div>
            </section>

            {/* ===== Services list ===== */}
            <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
                  <p className="text-4xl">🗂️</p>
                  <p className="mt-3 text-sm text-gray-500">
                    {search
                      ? "No services match your search."
                      : "No services in this category yet."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((service) => (
                    <ServiceCard
                      key={service.serviceId}
                      service={service}
                      fallbackEmoji={emojiFor(category.name)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}

function ServiceCard({
  service,
  fallbackEmoji,
}: {
  service: FlatService;
  fallbackEmoji: string;
}) {
  const hasImage = Boolean(service.profileImage);
  const lowestVariant =
    service.variants.length > 0
      ? Math.min(...service.variants.map((v) => v.price))
      : null;
  const displayPrice =
    service.price != null && service.price > 0 ? service.price : lowestVariant;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {/* Image / fallback */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-50">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- external service image
          <img
            src={service.profileImage as string}
            alt={service.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">
            {fallbackEmoji}
          </div>
        )}

        {service.groupName ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-gray-700 backdrop-blur">
            {service.groupName}
          </span>
        ) : null}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-tight text-gray-900">
            {service.name}
          </h3>
          <span className="flex shrink-0 items-center gap-1 rounded-md bg-green-50 px-1.5 py-0.5 text-xs font-semibold text-green-700">
            <StarIcon className="h-3 w-3" /> 4.8
          </span>
        </div>

        {service.description ? (
          <p className="mt-2 line-clamp-3 text-sm text-gray-500">
            {service.description}
          </p>
        ) : null}

        {/* meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {service.durationMinutes ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1">
              <ClockIcon className="h-3.5 w-3.5" /> {service.durationMinutes} mins
            </span>
          ) : null}
          {service.variants.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1">
              {service.variants.length} option
              {service.variants.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        {/* price + cta */}
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
          <div>
            <span className="text-[11px] uppercase tracking-wide text-gray-400">
              {lowestVariant != null && service.price ? "Starts at" : "Price"}
            </span>
            <p className="text-lg font-bold text-gray-900">
              {formatPrice(displayPrice)}
            </p>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700">
            Book
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
