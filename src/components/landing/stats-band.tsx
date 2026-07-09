"use client";

import { useEffect, useRef, useState } from "react";

interface Stat {
  value: number;
  suffix: string;
  label: string;
}

const STATS: Stat[] = [
  { value: 150, suffix: "+", label: "Our Clients" },
  { value: 98, suffix: "%", label: "Client Satisfaction Rate" },
  { value: 20, suffix: "%", label: "Avg. Cost Saving" },
  { value: 12, suffix: " yrs", label: "Founder Experience" },
];

const ACCENT = "#e2563b";

export function StatsBand() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="grid grid-cols-2 gap-y-8 rounded-3xl border border-gray-100 bg-white p-8 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)] sm:p-10 md:grid-cols-4">
        {STATS.map((stat, i) => (
          <div
            key={stat.label}
            className={`flex flex-col items-center text-center ${
              i > 0 ? "md:border-l md:border-gray-200" : ""
            }`}
          >
            <CountUp value={stat.value} suffix={stat.suffix} />
            <p className="mt-2 max-w-[10rem] text-sm font-medium text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CountUp({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      queueMicrotask(() => setDisplay(value));
      return;
    }

    let raf = 0;
    let start = 0;
    const duration = 1400;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const step = (ts: number) => {
          if (!start) start = ts;
          const progress = Math.min((ts - start) / duration, 1);
          // easeOutCubic for a lively-then-settling count.
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(eased * value));
          if (progress < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  return (
    <p
      ref={ref}
      className="text-4xl font-extrabold tracking-tight sm:text-5xl"
      style={{ color: ACCENT }}
    >
      {display}
      {suffix}
    </p>
  );
}
