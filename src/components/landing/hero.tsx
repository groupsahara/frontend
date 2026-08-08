"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.restocare.customer&pcampaignid=web_share";
const APP_STORE_URL =
  "https://apps.apple.com/in/app/restocare-stop-revenue-loss/id6787001148";

// Right-side photos from public/Banner.
const BANNER_IMAGES = ["/Banner/2.png", "/Banner/1.png"] as const;

interface HeroSlide {
  tagline: string;
  title: string;
  subtitle: string;
  image: string;
}

const SLIDES: HeroSlide[] = [
  {
    tagline: "India's trusted restaurant services app",
    title: "Skilled staff & repairs, delivered instantly",
    subtitle:
      "Book verified chefs, helpers, technicians and maintenance pros for your restaurant — on demand, near you.",
    image: BANNER_IMAGES[0],
  },
  {
    tagline: "Verified professionals at your doorstep",
    title: "Your restaurant, our care — every single day",
    subtitle:
      "From deep cleaning to kitchen equipment repair, Restocare keeps your restaurant running without a hitch.",
    image: BANNER_IMAGES[1],
  },
  {
    tagline: "Limited-time launch offer",
    title: "Flat 50% off on your first booking",
    subtitle:
      "Book any service — chefs, cleaning, repairs or maintenance — and get half off your first booking with Restocare.",
    image: BANNER_IMAGES[0],
  },
];

// Service highlights surfaced on the banner (Pronto-style trust strip).
const HIGHLIGHTS = [
  { icon: "⚡", label: "Instant Service" },
  { icon: "✅", label: "Verified Staff" },
  { icon: "⭐", label: "Certified Staff" },
  { icon: "🛡️", label: "Quality Assured" },
];

const SLIDE_INTERVAL_MS = 5000;

/** Render a title with the last two words highlighted in brand amber. */
function HighlightedTitle({ title }: { title: string }) {
  const words = title.trim().split(/\s+/);
  const cut = Math.max(words.length - 2, 1);
  return (
    <>
      {words.slice(0, cut).join(" ")}{" "}
      <span className="text-amber-500">{words.slice(cut).join(" ")}</span>
    </>
  );
}

function Stars() {
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`h-4 w-4 ${i < 4 ? "fill-amber-400" : "fill-amber-400/40"}`}
        >
          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}

function StoreButton({
  href,
  top,
  bottom,
  icon,
}: {
  href: string;
  top: string;
  bottom: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target={href === "#" ? undefined : "_blank"}
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 rounded-xl bg-gray-900 px-4 py-2 shadow-lg transition hover:bg-gray-700"
    >
      {icon}
      <span className="text-left leading-tight">
        <span className="block text-[10px] uppercase tracking-wide text-gray-400">{top}</span>
        <span className="block text-sm font-bold text-white">{bottom}</span>
      </span>
    </a>
  );
}

function GooglePlayIcon() {
  return (
    <svg viewBox="0 0 512 512" className="h-6 w-6 fill-white" aria-hidden>
      <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
    </svg>
  );
}

function AppStoreIcon() {
  return (
    <svg viewBox="0 0 384 512" className="h-6 w-6 fill-white" aria-hidden>
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

export function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (SLIDES.length < 2) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % SLIDES.length),
      SLIDE_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, []);

  const active = SLIDES[index % SLIDES.length];

  return (
    <section className="w-full">
      <div className="relative flex min-h-[80dvh] flex-col overflow-hidden bg-white">
        <div className="relative z-10 grid flex-1 items-end gap-x-10 px-6 pt-10 sm:px-10 lg:grid-cols-2 lg:px-16 lg:pt-12">
          {/* Left: text content (re-keyed per slide to replay entrance animations) */}
          <div key={index} className="self-center pb-8 lg:pb-16">
            <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-600 sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
              {active.tagline}
            </p>

            <h1
              className="animate-fade-up mt-4 text-3xl font-extrabold leading-tight text-gray-900 sm:text-4xl lg:text-5xl xl:text-6xl"
              style={{ animationDelay: "0.08s" }}
            >
              <HighlightedTitle title={active.title} />
            </h1>

            <p
              className="animate-fade-up mt-4 max-w-lg text-sm text-gray-600 sm:text-base lg:text-lg"
              style={{ animationDelay: "0.16s" }}
            >
              {active.subtitle}
            </p>

            <div
              className="animate-fade-up mt-7 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "0.24s" }}
            >
              <StoreButton
                href={PLAY_STORE_URL}
                top="Get it on"
                bottom="Google Play"
                icon={<GooglePlayIcon />}
              />
              <StoreButton
                href={APP_STORE_URL}
                top="Download on the"
                bottom="App Store"
                icon={<AppStoreIcon />}
              />
            </div>

            <div
              className="animate-fade-up mt-6 hidden flex-wrap items-center gap-2.5"
              style={{ animationDelay: "0.32s" }}
            >
              <Stars />
              <span className="text-sm font-bold text-gray-900">4.8/5</span>
              <span className="text-sm text-gray-500">
                Rated by 2,000+ restaurant owners
              </span>
            </div>
          </div>

          {/* Right: local Banner image container */}
          <div className="relative mx-auto aspect-2/3 w-full max-w-[22rem] ml-auto mr-0 overflow-hidden sm:max-w-sm lg:mb-0  xl:max-w-md">
            {SLIDES.map((slide, i) => (
              <Image
                key={i}
                src={slide.image}
                alt="Restocare service professional"
                fill
                sizes="(max-width: 1024px) 90vw, 38vw"
                className={`object-cover object-center transition-opacity duration-700 ${
                  i === index % SLIDES.length ? "opacity-100" : "opacity-0"
                }`}
                preload={i === 0}
              />
            ))}
          </div>
        </div>

        {/* Slide dots */}
        {SLIDES.length > 1 && (
          <div className="absolute bottom-16 left-6 z-20 flex gap-2 sm:left-10 lg:left-16">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Show slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index % SLIDES.length
                    ? "w-6 bg-amber-500"
                    : "w-1.5 bg-gray-300 hover:bg-gray-400"
                }`}
              />
            ))}
          </div>
        )}

        {/* Service highlights strip */}
        <div className="relative z-10 hidden border-t border-gray-100 bg-white px-6 py-3.5 sm:block sm:px-10 lg:px-16">
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {HIGHLIGHTS.map((h) => (
              <span
                key={h.label}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-800"
              >
                <span className="text-base">{h.icon}</span>
                {h.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile highlights (below banner) */}
      <div className="mt-3 grid grid-cols-2 gap-2 px-4 sm:hidden">
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
