"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LandingHeader } from "@/src/components/landing/landing-header";
import { Footer } from "@/src/components/landing/footer";
import { useCustomerAuth } from "@/src/lib/customer-auth";
import { SpinnerIcon, LogoutIcon } from "@/src/components/icons";

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  href: string;
  comingSoon?: boolean;
}

// Mirrors the RN AccountScreen menu (chats filtered out, like the app does).
const MENU: MenuItem[] = [
  { id: "orders", title: "My Orders", subtitle: "Track your bookings & history", icon: "🛍️", href: "/account/orders" },
  { id: "loyalty", title: "Loyalty", subtitle: "Points and perks", icon: "💖", href: "/account/loyalty", comingSoon: true },
  { id: "wallet", title: "Wallet", subtitle: "Balance and cashback", icon: "💳", href: "/account/wallet", comingSoon: true },
  { id: "wishlist", title: "Wishlist", subtitle: "Saved services", icon: "🤍", href: "/account/wishlist", comingSoon: true },
  { id: "join", title: "Join Us", subtitle: "Partner with RestoCare", icon: "🔗", href: "/account/join", comingSoon: true },
  { id: "settings", title: "Settings", subtitle: "Preferences, privacy & account", icon: "⚙️", href: "/account/settings" },
  { id: "sos", title: "SOS", subtitle: "Emergency support", icon: "🆘", href: "/account/sos" },
  { id: "contact", title: "Support Center", subtitle: "WhatsApp, Call & Email support", icon: "🎧", href: "/account/contact" },
];

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoggedIn, isHydrating, logout } = useCustomerAuth();

  // Not logged in → bounce to the customer login (once hydration settles).
  useEffect(() => {
    if (!isHydrating && !isLoggedIn) router.replace("/account/login?redirect=/account");
  }, [isHydrating, isLoggedIn, router]);

  if (isHydrating || !isLoggedIn) {
    return (
      <div data-theme="light" className="min-h-dvh bg-gray-50">
        <LandingHeader search="" onSearchChange={() => {}} />
        <div className="flex h-[60vh] items-center justify-center text-gray-400">
          <SpinnerIcon className="h-7 w-7" />
        </div>
      </div>
    );
  }

  const name = user?.name?.trim() || "RestoCare User";
  const contact =
    user?.email?.trim() || user?.mobile?.trim() || user?.phone?.trim() || "";
  const initial = (name.charAt(0) || "U").toUpperCase();

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  return (
    <div data-theme="light" className="min-h-dvh bg-gray-50">
      <LandingHeader search="" onSearchChange={() => {}} />

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-2xl leading-none text-gray-900"
            aria-label="Back"
          >
            ←
          </button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">My Account</h1>
        </div>

        {/* Profile card */}
        <div className="flex items-center gap-4 rounded-2xl bg-[#3b34cc] p-5 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/25 text-xl font-bold text-white">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-white">{name}</p>
            {contact ? (
              <p className="truncate text-sm text-indigo-100">{contact}</p>
            ) : null}
          </div>
        </div>

        {/* Menu */}
        <div className="mt-5 space-y-3">
          {MENU.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className="flex w-full items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:border-gray-300"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-base">
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900">{item.title}</span>
                <span className="block truncate text-xs text-gray-400">{item.subtitle}</span>
              </span>
              {item.comingSoon ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                  Coming soon
                </span>
              ) : (
                <span className="text-gray-300">›</span>
              )}
            </button>
          ))}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-left transition hover:bg-red-100"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <LogoutIcon className="h-4 w-4" />
            </span>
            <span className="flex-1 text-sm font-semibold text-red-600">Logout</span>
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
