"use client";

import { useState } from "react";
import Link from "next/link";
import { LandingHeader } from "@/src/components/landing/landing-header";
import { Footer } from "@/src/components/landing/footer";
import { CursorFollower } from "@/src/components/landing/cursor-follower";

const SUPPORT_EMAIL = "support@restocare.in";
const SUPPORT_PHONE = "+91 98993 00646";
const SUPPORT_PHONE_TEL = "+919899300646";
const OFFICE_ADDRESS = "KD-180 Kohat Enclave, Pitampura, Delhi";

const CONTACT_DETAILS = [
  {
    icon: "📍",
    title: "Head Office",
    value: OFFICE_ADDRESS,
    href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE_ADDRESS)}`,
  },
  {
    icon: "📞",
    title: "Phone",
    value: SUPPORT_PHONE,
    href: `tel:${SUPPORT_PHONE_TEL}`,
  },
  {
    icon: "💬",
    title: "WhatsApp",
    value: SUPPORT_PHONE,
    href: `https://wa.me/${SUPPORT_PHONE_TEL.replace("+", "")}`,
  },
  {
    icon: "✉️",
    title: "Email",
    value: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
  },
];

const BUSINESS_HOURS = [
  { days: "Monday – Saturday", hours: "9:00 AM – 7:00 PM" },
  { days: "Sunday", hours: "Closed" },
];

export default function ContactPage() {
  // LandingHeader expects a controlled search box; this page has no listing to filter.
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject || "Website enquiry",
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="min-h-screen bg-white">
      <CursorFollower />
      <LandingHeader search={search} onSearchChange={setSearch} />

      {/* Hero */}
      <section className="border-b border-gray-100 bg-white px-4 py-12 text-gray-900 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-orange-600">
            Contact Us
          </p>
          <h1 className="text-xl font-bold tracking-tight sm:text-5xl">
            We&apos;re here to help
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-gray-600 sm:text-base">
            Questions about a booking, partnership or anything else? Reach us on
            call, WhatsApp or email — or drop us a message below.
          </p>
        </div>
      </section>

      {/* Company details + form */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left: company details */}
          <div className="flex flex-col overflow-hidden rounded-2xl bg-[#0F1115] text-gray-300 lg:col-span-2">
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-white">RestoCare</h2>
              <p className="mt-2 text-sm text-gray-400">
                A brand operated by Restroedge Private Limited — connecting
                restaurants with trusted service professionals.
              </p>

              <ul className="mt-8 space-y-5">
                {CONTACT_DETAILS.map((d) => (
                  <li key={d.title}>
                    <a
                      href={d.href}
                      target={d.href.startsWith("http") ? "_blank" : undefined}
                      rel={
                        d.href.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      className="group flex items-start gap-4"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg transition group-hover:bg-orange-600/20">
                        {d.icon}
                      </span>
                      <span>
                        <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {d.title}
                        </span>
                        <span className="block text-sm font-medium text-white transition group-hover:text-orange-400">
                          {d.value}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>

              <div className="mt-8 border-t border-white/10 pt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Business Hours
                </h3>
                <ul className="mt-3 space-y-2">
                  {BUSINESS_HOURS.map((b) => (
                    <li
                      key={b.days}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-400">{b.days}</span>
                      <span className="font-medium text-white">{b.hours}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-auto bg-orange-600 px-6 py-4 text-sm font-medium text-white sm:px-8">
              We typically reply within 24 hours.
            </div>
          </div>

          {/* Right: message form */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-3">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              Send us a message
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Fill in the form and we&apos;ll get back to you as soon as
              possible.
            </p>

            <form onSubmit={handleSubmit} className="mt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                  >
                    Your name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact-email"
                    className="mb-1 block text-xs font-semibold text-gray-700"
                  >
                    Email address
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="contact-subject"
                  className="mb-1 block text-xs font-semibold text-gray-700"
                >
                  Subject
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="How can we help?"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div className="mt-4">
                <label
                  htmlFor="contact-message"
                  className="mb-1 block text-xs font-semibold text-gray-700"
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us a little more..."
                  className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <button
                type="submit"
                className="mt-6 w-full rounded-full bg-orange-600 px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 sm:w-auto"
              >
                Send message
              </button>
            </form>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
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
