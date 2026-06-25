"use client";

import { useRef } from "react";
import { ArrowRightIcon, StarIcon } from "@/src/components/icons";

export function RestaurantRepair() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollByCards = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const services = [
    {
      id: 1,
      name: "Kitchen Equipment Repair",
      rating: "4.73",
      reviews: "1.2k",
      hasInstant: true,
      price: "₹149",
      image: "/Kitchen Equipment Repair.png",
    },
    {
      id: 2,
      name: "Exhaust Fan Repair",
      rating: "4.74",
      reviews: "850",
      hasInstant: false,
      price: "₹99",
      image: "/Exhaust Fan Repair.png",
    },
    {
      id: 3,
      name: "Commercial Plumbing",
      rating: "4.79",
      reviews: "2.1k",
      hasInstant: false,
      price: "₹199",
      image: "/Commercial Plumbing.png",
    },
    {
      id: 4,
      name: "Switchboard Repair & Replacement",
      rating: "4.83",
      reviews: "3.4k",
      hasInstant: true,
      price: "₹99",
      image: "/Switchboard Repair & Replacement.png",
    },
    {
      id: 5,
      name: "HVAC Maintenance",
      rating: "4.80",
      reviews: "1.1k",
      hasInstant: true,
      price: "₹249",
      image: "/HVAC Maintenance.png",
    },
  ];

  return (
    <section className="bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8">
          <h2 className="text-xl font-bold tracking-tight text-[#0A192F] sm:text-[38px]">
            Restaurant Maintenance, Repair &amp; Installation Services
          </h2>
        </div>

        <div className="group/scroller relative">
          {/* Left / right controls */}
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollByCards(-1)}
            className="absolute -left-5 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition hover:bg-gray-50 sm:flex"
          >
            <ArrowRightIcon className="h-5 w-5 rotate-180" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollByCards(1)}
            className="absolute -right-5 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition hover:bg-gray-50 sm:flex"
          >
            <ArrowRightIcon className="h-5 w-5" />
          </button>

          {/* Carousel container */}
          <div
            ref={scrollRef}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-4 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {services.map((service) => (
              <div
                key={service.id}
                className="w-[280px] shrink-0 snap-start sm:w-[300px]"
              >
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative w-full shrink-0 overflow-hidden bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={service.image}
                      alt={service.name}
                      className="h-auto w-full object-contain transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="mb-2 font-bold text-gray-900">{service.name}</h3>
                    
                    <div className="mb-4 flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                        <StarIcon className="h-3.5 w-3.5 text-yellow-400" />
                        <span>{service.rating}</span>
                      </div>
                      
                      {service.hasInstant && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-green-600">
                            <span>⚡</span> Instant
                          </span>
                        </>
                      )}
                    </div>
                    
                    <div className="mt-auto pt-2">
                      <span className="font-bold text-gray-900">{service.price}</span>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
