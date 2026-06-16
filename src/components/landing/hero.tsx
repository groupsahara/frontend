"use client";

import Image from "next/image";
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

export function Hero() {
  const { data: banners } = useQuery({
    queryKey: [...queryKeys.bannersActive, "WEB"],
    queryFn: () => bannerApi.listActive("WEB"),
  });

  // Managed banners take precedence; fall back to the built-in imagery.
  const images = banners && banners.length > 0 ? banners.map((b) => b.imageUrl) : FALLBACK_IMAGES;

  return (
    <section className="mx-auto w-full max-w-8xl px-4 py-6 sm:px-6">
      <Swiper
        modules={[Autoplay, EffectFade]}
        effect="fade"
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        loop={true}
        className="w-full"
      >
        {images.map((src, index) => (
          <SwiperSlide key={index}>
            <div className="relative w-full aspect-[1720/650] overflow-hidden rounded-2xl">
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
    </section>
  );
}
