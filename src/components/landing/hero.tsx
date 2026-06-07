"use client";

import { StarIcon, UsersIcon } from "@/src/components/icons";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";

import "swiper/css";
import "swiper/css/effect-fade";

const IMAGES = [
  "https://plain-apac-prod-public.komododecks.com/202606/07/TGdQgmdeyYfX7Z7E2See/image.jpg",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1920&q=80",
  // "https://res.cloudinary.com/dijucynmp/image/upload/f_auto,q_auto/51c9d608-ee28-4051-8e4c-7bd18fff0abe_1_kc5axn",
  // "https://instasize.com/api/image/6f277fe63c1823b52807f82454ab2496c2993a43b80fb3b38bd98dbf32be4097.jpeg",
  // "https://canva.link/ge0f4vlkld7kfuw",
  // "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1920&q=80",
];

export function Hero() {
  return (
    <section className="relative border-b border-gray-800 bg-gray-900">
      {/* Background Carousel */}
      <div className="absolute inset-0 z-0">
        <Swiper
          modules={[Autoplay, EffectFade]}
          effect="fade"
          autoplay={{ delay: 3000, disableOnInteraction: false }}
          loop={true}
          className="h-full w-full"
        >
          {IMAGES.map((src, index) => (
            <SwiperSlide key={index}>
              <div
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${src})` }}
              />
            </SwiperSlide>
          ))}
        </Swiper>
        {/* Dark Overlay for Text Readability */}
        <div className="absolute inset-0 z-10 bg-black/60"></div>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:py-24">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
          Restaurant Staffing solutions at your doorstep
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-gray-200">
          Book trusted professionals for cleaning, beauty, repairs and more — verified
          services, transparent pricing, right where you are.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a
            href="#categories"
            className="rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
          >
            Explore categories
          </a>
          <a
            href="#services"
            className="rounded-xl border border-gray-300 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
          >
            Browse services
          </a>
        </div>

        {/* Trust stats */}
        <div className="mt-12 flex justify-center gap-12">
          <div className="flex items-center gap-3">
            <StarIcon className="h-6 w-6 text-yellow-400" />
            <div className="text-left">
              <p className="text-xl font-bold text-white">4.8</p>
              <p className="text-xs text-gray-300">Service Rating*</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UsersIcon className="h-6 w-6 text-blue-400" />
            <div className="text-left">
              <p className="text-xl font-bold text-white">12M+</p>
              <p className="text-xs text-gray-300">Customers Globally*</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
