"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { categoryTreeApi, queryKeys, type CategoryTreeNode } from "@/src/api/api";
import { SpinnerIcon } from "@/src/components/icons";

interface PopularCategoriesProps {
  /** Kept for backwards-compat with the landing page; clicking a tile now
   *  navigates to the category page instead of filtering in place. */
  selectedCategoryId?: number | null;
  onSelect?: (categoryId: number | null) => void;
}

/** Videos for the right-hand collage (order: video2, video3, video4, video1). */
const COLLAGE_VIDEOS = [
  "/videos/video2.mp4",
  "/videos/video3.mp4",
  "/videos/video4.mp4",
  "/videos/video1.mp4",
];

/** Emoji fallback per category name (used when a category has no image). */
const EMOJI_BY_NAME: Record<string, string> = {
  "executive chef": "👨‍🍳",
  "sous chef": "🍳",
  cdp: "🍲",
  commis: "🔪",
  steward: "🍽️",
  housekeeping: "🧹",
  "utility staff": "🧽",
  bartender: "🍸",
  chef: "👨‍🍳",
  "chef catagory": "👨‍🍳",
  "helpers & waiters": "🧑‍🍳",
  carpenter: "🔨",
  electrician: "💡",
  "pest controll": "🐜",
  "pest control": "🐜",
  technician: "🛠️",
  "deep cleaning": "🧼",
  plumber: "🚿",
  cleaning: "🧹",
  beauty: "💇",
  salon: "💅",
};

const FALLBACK_EMOJI = "🧰";

/** Trust highlights shown under the category grid to fill the card nicely. */
const HIGHLIGHTS = [
  { icon: "✅", label: "Verified Staff", sub: "Background-checked" },
  { icon: "⭐", label: "Certified Staff", sub: "Trained & certified" },
  { icon: "⚡", label: "Instant Service", sub: "Quick availability" },
];

function emojiFor(name: string): string {
  return EMOJI_BY_NAME[name.trim().toLowerCase()] ?? FALLBACK_EMOJI;
}

export function PopularCategories(_props: PopularCategoriesProps) {
  void _props;
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.categoryTree,
    queryFn: () => categoryTreeApi.tree(),
  });

  const categories = data ?? [];

  return (
    <section id="categories" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-[38px]">
          POPULAR CATEGORIES
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-500 sm:text-base">
          Choose your service category and connect with top-rated professionals near you.
        </p>
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* LEFT — category card */}
        <div className="flex flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
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
            <div className="grid grid-cols-4 gap-x-3 gap-y-5">
              {categories.map((category) => (
                <CategoryTile key={category.categoryId} category={category} />
              ))}
            </div>
          )}

          {/* Bottom highlights + CTA — fills the remaining space nicely */}
          <div className="mt-auto pt-8">
            <div className="grid grid-cols-3 gap-3">
              {HIGHLIGHTS.map((h) => (
                <div
                  key={h.label}
                  className="flex flex-col items-center gap-1.5 rounded-2xl bg-gray-50 px-2 py-4 text-center"
                >
                  <span className="text-2xl">{h.icon}</span>
                  <span className="text-xs font-semibold text-gray-800">{h.label}</span>
                  <span className="text-[11px] leading-tight text-gray-500">{h.sub}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-2xl bg-linear-to-r from-orange-500 to-orange-600 px-5 py-4 text-white sm:flex-row sm:text-left">
              <div>
                <p className="text-sm font-bold">Can’t find your service?</p>
                <p className="text-xs text-orange-50">Browse our full catalog of trusted professionals.</p>
              </div>
              <Link
                href="#services"
                className="shrink-0 rounded-full bg-white px-5 py-2 text-sm font-bold text-orange-600 transition hover:bg-orange-50"
              >
                Explore all
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT — video collage covering the space */}
        <div className="hidden grid-cols-2 gap-4 lg:grid">
          {COLLAGE_VIDEOS.map((src, i) => (
            <CollageVideo key={i} src={src} className="aspect-square" />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryTile({ category }: { category: CategoryTreeNode }) {
  const hasImage = Boolean(category.profileImage);
  return (
    <Link
      href={`/category/${category.categoryId}`}
      className="group flex cursor-pointer flex-col items-center gap-2 text-center"
    >
      <div className="relative flex h-17.5 w-15 items-center justify-center overflow-hidden rounded-2xl border border-transparent bg-gray-50 transition group-hover:border-gray-200 group-hover:shadow-sm">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- external category images
          <img
            src={category.profileImage}
            alt={category.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-3xl transition duration-300 group-hover:scale-110">
            {emojiFor(category.name)}
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-xs font-medium leading-tight text-gray-800">
        {category.name}
      </p>
    </Link>
  );
}

function CollageVideo({ src, className }: { src: string; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-black ${className ?? ""}`}
    >
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}
