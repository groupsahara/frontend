"use client";

import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

interface Brand {
  name: string;
  logo: string;
}

const BRANDS: Brand[] = [
  {
    name: "Indian Air Force",
    logo: "/brands/army.png",
  },
  {
    name: "Burger Singh",
    logo: "/brands/burger.png",
  },
  {
    name: "McDonald's",
    logo: "/brands/macdonal.jpg",
  },
  {
    name: "Skill India",
    logo: "/brands/skill.png",
  },
  {
    name: "Tourism & Hospitality Skill Council",
    logo: "/brands/thsc.png",
  },
  {
    name: "Pyramid Cafe",
    logo: "/brands/pyramid.jpeg",
  },
  {
    name: "Domino's",
    logo: "/brands/dominos.png",
  },
  {
    name: "KFC",
    logo: "/brands/kfc.svg",
  },
  {
    name: "Subway",
    logo: "/brands/subway.webp",
  },
  {
    name: "Barbeque Nation",
    logo: "/brands/barbeque.png",
  },
  {
    name: "Taj Hotels",
    logo: "/brands/taj.svg"
  },
];

export function Brands() {
  return (
    <section className="bg-gradient-to-b from-white to-gray-50 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-[38px]">
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
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
              pauseOnMouseEnter: true,
            }}
            allowTouchMove={false}
            breakpoints={{
              640: { slidesPerView: 3 },
              1024: { slidesPerView: 5 },
              1280: { slidesPerView: 6 },
            }}
            className="!ease-linear [&_.swiper-wrapper]:!ease-linear"
          >
            {BRANDS.map((brand) => (
              <SwiperSlide key={brand.name}>
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
  return (
    <div className="group flex flex-col items-center gap-3 py-2 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-100 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
        <Image
          src={brand.logo}
          alt={brand.name}
          width={60}
          height={60}
          className="object-contain"
        />
      </div>

      <p className="max-w-[9rem] text-sm font-medium leading-tight text-gray-700">
        {brand.name}
      </p>
    </div>
  );
}