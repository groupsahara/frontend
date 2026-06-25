"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { bannerApi, queryKeys } from "@/src/api/api";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";

import "swiper/css";
import "swiper/css/effect-fade";

// Fallback imagery shown until banners are configured in the admin panel.
const FALLBACK_IMAGES = [
  "https://plain-apac-prod-public.komododecks.com/202606/07/TGdQgmdeyYfX7Z7E2See/image.jpg",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1920&q=80",
];

// Service highlights surfaced on the banner (Pronto-style trust strip).
const HIGHLIGHTS = [
  { icon: "⚡", label: "Instant Service" },
  { icon: "✅", label: "Verified Staff" },
  { icon: "⭐", label: "Certified Staff" },
  { icon: "🛡️", label: "Quality Assured" },
];

export function Hero() {
  const { data: banners } = useQuery({
    queryKey: [...queryKeys.bannersActive, "WEB"],
    queryFn: () => bannerApi.listActive("WEB"),
  });

  // Managed banners take precedence; fall back to the built-in imagery.
  const images =
    banners && banners.length > 0
      ? banners.map((b) => b.imageUrl)
      : FALLBACK_IMAGES;

  return (
    <section className="mx-auto w-full max-w-8xl px-4 py-4 sm:py-4 sm:px-4">
      <div className="relative overflow-hidden rounded-2xl">
        {/* Background slider */}
        <Swiper
          modules={[Autoplay, EffectFade]}
          effect="fade"
          autoplay={{ delay: 3000, disableOnInteraction: false }}
          loop={true}
          className="w-full"
        >
          {images.map((src, index) => (
            <SwiperSlide key={index}>
              <div className="relative w-full aspect-1720/650">
                <Image
                  src={src}
                  fill
                  alt="banner"
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  className="object-cover object-center"
                  priority={index === 0}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Overlay content (sits above the slider, constant across slides) */}
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-center  to-transparent px-6 sm:px-10 lg:px-16">
          <div className="max-w-xl">
            <p className="mb-2 hidden rounded-full bg-orange-500/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white sm:text-xs md:inline-flex">
              Trusted restaurant services
            </p>
            <h1 className="hidden text-sm font-bold leading-tight text-black drop-shadow-sm sm:text-4xl lg:text-5xl md:block">
              Skilled staff &amp; repairs,
              <br className="hidden sm:block" /> delivered instantly
            </h1>
            <p className="mt-3 hidden max-w-md text-xs text-black sm:text-base md:block">
              Book verified chefs, helpers, technicians and maintenance pros for
              your restaurant — on demand, near you.
            </p>

            {/* <div className="pointer-events-auto mt-5 flex flex-wrap gap-3">
              <Link
                href="#categories"
                className="rounded-full bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-orange-700"
              >
                Explore Categories
              </Link>
              <Link
                href="#services"
                className="rounded-full bg-white/95 px-6 py-3 text-sm font-bold text-gray-900 shadow-lg transition hover:bg-white"
              >
                Browse Services
              </Link>
            </div> */}
          </div>
        </div>

        {/* Service highlights strip */}
        <div className="absolute inset-x-0 bottom-0 z-10 hidden bg-linear-to-t from-black/70 to-transparent px-6 pb-4 pt-10 sm:block sm:px-10 lg:px-16">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {HIGHLIGHTS.map((h) => (
              <span
                key={h.label}
                className="flex items-center gap-1.5 text-sm font-semibold text-white"
              >
                <span className="text-base">{h.icon}</span>
                {h.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile highlights (below banner) */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
        {HIGHLIGHTS.map((h) => (
          <span
            key={h.label}
            className="flex items-center gap-1.5 rounded-xl bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-800"
          >
            <span className="text-sm">{h.icon}</span>
            {h.label}
          </span>
        ))}
      </div>
    </section>
  );
}
