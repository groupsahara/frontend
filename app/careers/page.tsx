"use client";

import { useState } from "react";
import Link from "next/link";
import { LandingHeader } from "@/src/components/landing/landing-header";
import { Footer } from "@/src/components/landing/footer";
import { CursorFollower } from "@/src/components/landing/cursor-follower";

interface Opening {
  id: string;
  title: string;
  type: string;
  location: string;
  blurb: string;
}

const OPENINGS: Opening[] = [
  {
    id: "ops-executive",
    title: "Operations Executive",
    type: "Full-time",
    location: "Pitampura, Delhi",
    blurb:
      "Coordinate bookings, vendors and dispatch to keep service delivery running smoothly across the city.",
  },
  {
    id: "field-supervisor",
    title: "Field Service Supervisor",
    type: "Full-time",
    location: "Delhi NCR",
    blurb:
      "Lead on-ground technician teams, ensure quality standards and resolve escalations at customer sites.",
  },
  {
    id: "customer-support",
    title: "Customer Support Associate",
    type: "Full-time",
    location: "Pitampura, Delhi",
    blurb:
      "Be the voice of RestoCare — handle queries over call, chat and WhatsApp with empathy and speed.",
  },
  {
    id: "business-dev",
    title: "Business Development Manager",
    type: "Full-time",
    location: "Delhi NCR",
    blurb:
      "Onboard restaurants and partners, build relationships and grow our service network.",
  },
];

const PERKS = [
  { icon: "🚀", title: "Fast growth", sub: "Grow with a scaling startup" },
  { icon: "🤝", title: "Great team", sub: "Supportive, hands-on culture" },
  { icon: "📚", title: "Learning", sub: "On-the-job skill building" },
  { icon: "💰", title: "Fair pay", sub: "Competitive compensation" },
];

const HR_EMAIL = "support@restocare.in";

export default function CareersPage() {
  // LandingHeader expects a controlled search box; this page has no listing to filter.
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen bg-white">
      <CursorFollower />
      <LandingHeader search={search} onSearchChange={setSearch} />

      {/* Hero */}
      <section className="border-b border-gray-100 bg-white px-4 py-16 text-gray-900 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-orange-600">
            Careers at RestoCare
          </p>
          <h1 className="text-xl font-bold tracking-tight sm:text-5xl">
            Build the future of restaurant services
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-gray-600 sm:text-base">
            Join a team that connects restaurants with trusted professionals every day.
            We&apos;re hiring across operations, field service and support.
          </p>
          <a
            href="#openings"
            className="mt-8 inline-flex rounded-full bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700"
          >
            View open roles
          </a>
        </div>
      </section>

      {/* Perks */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {PERKS.map((p) => (
            <div
              key={p.title}
              className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-6 text-center"
            >
              <span className="text-3xl">{p.icon}</span>
              <span className="text-sm font-semibold text-gray-900">{p.title}</span>
              <span className="text-xs text-gray-500">{p.sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Openings */}
      <section id="openings" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Open Positions
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
            Found a role that fits? Apply by emailing us your résumé.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {OPENINGS.map((o) => (
            <div
              key={o.id}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-orange-300 hover:shadow-md"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">{o.title}</h3>
                <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700">
                  {o.type}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">📍 {o.location}</p>
              <p className="mt-3 flex-1 text-sm text-gray-600">{o.blurb}</p>
              <a
                href={`mailto:${HR_EMAIL}?subject=${encodeURIComponent(
                  `Application: ${o.title}`,
                )}`}
                className="mt-5 inline-flex w-fit rounded-full bg-orange-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-orange-700"
              >
                Apply now
              </a>
            </div>
          ))}
        </div>

        {/* General application */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 px-6 py-6 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-sm font-bold text-gray-900">
              Don&apos;t see the right role?
            </p>
            <p className="text-xs text-gray-500">
              Send us your résumé and we&apos;ll reach out when something opens up.
            </p>
          </div>
          <a
            href={`mailto:${HR_EMAIL}?subject=${encodeURIComponent(
              "General Application",
            )}`}
            className="shrink-0 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800"
          >
            Email your résumé
          </a>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Or go back to the{" "}
          <Link href="/" className="font-medium text-orange-600 hover:underline">
            home page
          </Link>
          .
        </p>
      </section>

      <Footer />
    </div>
  );
}
