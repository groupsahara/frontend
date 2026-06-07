"use client";

import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

interface Brand {
  name: string;
  /** Optional company domain — used to fetch a logo via Clearbit. */
  domain?: string;
}

const BRANDS: Brand[] = [
  { name: "Indian Airforce" },
  { name: "Burger Singh", domain: "burgersinghonline.com" },
  { name: "McDonald's", domain: "mcdonalds.com" },
  { name: "Skill India" },
  { name: "Tourism & Hospitality Skill Council" },
  { name: "Pyramid Cafe" },
  { name: "Domino's", domain: "dominos.com" },
  { name: "KFC", domain: "kfc.com" },
  { name: "Subway", domain: "subway.com" },
  { name: "Barbeque Nation", domain: "barbequenation.com" },
  { name: "Taj Hotels", domain: "tajhotels.com" },
];

export function Brands() {
  return (
    <section className="bg-gradient-to-b from-white to-gray-50 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Our Associated Brands
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-gray-500">
          Trusted by leading restaurants, institutions and hospitality brands.
        </p>

        <div className="mt-10">
          <Swiper
            modules={[Autoplay]}
            loop
            speed={4000}
            spaceBetween={24}
            slidesPerView={2}
            autoplay={{ delay: 0, disableOnInteraction: false, pauseOnMouseEnter: true }}
            allowTouchMove={false}
            breakpoints={{
              640: { slidesPerView: 3 },
              1024: { slidesPerView: 5 },
              1280: { slidesPerView: 6 },
            }}
            className="!ease-linear [&_.swiper-wrapper]:!ease-linear"
          >
            {BRANDS.map((brand) => (
              <SwiperSlide key={brand.name} className="!h-auto">
                <BrandLogo brand={brand} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}

function BrandLogo({ brand }: { brand: Brand }) {
  const [errored, setErrored] = useState(false);
  const logoUrl = brand.domain ? `https://logo.clearbit.com/${brand.domain}` : null;

  const initials = brand.name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="group flex flex-col items-center gap-3 py-2 text-center">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-gray-100 transition duration-300 group-hover:-translate-y-1 group-hover:shadow-md">
        {logoUrl && !errored ? (
          // eslint-disable-next-line @next/next/no-img-element -- external brand logos
          <img
            src={logoUrl}
            alt={brand.name}
            className="h-10 w-10 object-contain grayscale transition duration-300 group-hover:grayscale-0"
            onError={() => setErrored(true)}
          />
        ) : (
          <span className="text-lg font-bold text-gray-400 transition group-hover:text-[#e2563b]">
            {initials}
          </span>
        )}
      </div>
      <p className="max-w-[9rem] text-sm font-medium leading-tight text-gray-600">{brand.name}</p>
    </div>
  );
}
