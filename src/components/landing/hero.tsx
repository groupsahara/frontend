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
    queryKey: queryKeys.bannersActive,
    queryFn: () => bannerApi.listActive(),
  });

  // Managed banners take precedence; fall back to the built-in imagery.
  const images = banners && banners.length > 0 ? banners.map((b) => b.imageUrl) : FALLBACK_IMAGES;

  return (
    <section className="w-full border-b border-gray-800 min-h-62.5 lg:min-h-175">
      <Swiper
        modules={[Autoplay, EffectFade]}
        effect="fade"
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        loop={true}
        className="h-full w-full min-h-62.5 lg:min-h-175"
      >
        {images.map((src, index) => (
          <SwiperSlide key={index} className="relative min-h-62.5 lg:min-h-175">
            <Image
              src={src}
              alt=""
              fill
              className="object-cover"
              priority={index === 0}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
