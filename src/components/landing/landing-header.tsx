"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  categoryTreeApi,
  queryKeys,
  type CategoryTreeNode,
} from "@/src/api/api";
import { useCurrentLocation } from "@/src/lib/location";
import { useCart } from "@/src/lib/cart";
import { useCustomerAuth } from "@/src/lib/customer-auth";
import {
  CartIcon,
  ChevronDownIcon,
  MapPinIcon,
  SearchIcon,
  SpinnerIcon,
  UserCircleIcon,
} from "@/src/components/icons";

const LOGO_URL =
  "https://imgproxy.royodispatch.com/insecure/fit/300/100/sm/0/plain/https://restocare-asset.s3.ap-south-1.amazonaws.com/assets/Clientlogo/FE4tX1iKGv1yJIk1JijoEtq11jm1yGTIdMPIUjpa.png";

const NAV_LINKS = [
  { label: "Categories", href: "#categories" },
  { label: "Services", href: "#services" },
];

const EMOJI_BY_NAME: Record<string, string> = {
  chef: "👨‍🍳",
  plumber: "🚿",
  electrician: "💡",
  technician: "🛠️",
  "deep cleaning": "🧼",
  "helpers & waiter": "🧑‍🍳",
  "pest controll": "🐜",
  "pest control": "🐜",
  carpenter: "🔨",
};

function emojiFor(name: string): string {
  return EMOJI_BY_NAME[name.trim().toLowerCase()] ?? "🧰";
}

function formatPrice(price: number | null): string {
  if (price == null || price <= 0) return "On request";
  return `₹${price.toLocaleString("en-IN")}`;
}

interface CategoryResult {
  kind: "category";
  categoryId: number;
  name: string;
  profileImage: string | null;
  serviceCount: number;
}

interface ServiceResult {
  kind: "service";
  serviceId: number;
  name: string;
  price: number | null;
  profileImage: string | null;
  categoryId: number;
  categoryName: string;
}

interface LandingHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function LandingHeader({ search, onSearchChange }: LandingHeaderProps) {
  const location = useCurrentLocation();
  const { count, openMini } = useCart();
  const { isLoggedIn, user } = useCustomerAuth();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: queryKeys.categoryTree,
    queryFn: () => categoryTreeApi.tree(),
  });

  // Build flat, searchable indexes of categories + every service once.
  const { categories, services } = useMemo(() => {
    const cats: CategoryResult[] = [];
    const svcs: ServiceResult[] = [];
    for (const cat of data ?? ([] as CategoryTreeNode[])) {
      const direct = cat.services;
      const nested = cat.groups.flatMap((g) => g.services);
      cats.push({
        kind: "category",
        categoryId: cat.categoryId,
        name: cat.name,
        profileImage: cat.profileImage,
        serviceCount: direct.length + nested.length,
      });
      for (const s of [...direct, ...nested]) {
        svcs.push({
          kind: "service",
          serviceId: s.serviceId,
          name: s.name,
          price: s.price,
          profileImage: s.profileImage,
          categoryId: cat.categoryId,
          categoryName: cat.name,
        });
      }
    }
    return { categories: cats, services: svcs };
  }, [data]);

  const query = search.trim().toLowerCase();
  const matchedCategories = useMemo(
    () =>
      query
        ? categories.filter((c) => c.name.toLowerCase().includes(query)).slice(0, 4)
        : [],
    [categories, query],
  );
  const matchedServices = useMemo(
    () =>
      query
        ? services.filter((s) => s.name.toLowerCase().includes(query)).slice(0, 6)
        : [],
    [services, query],
  );

  const hasResults = matchedCategories.length > 0 || matchedServices.length > 0;
  const showDropdown = open && query.length > 0;

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- external CDN logo */}
          <img src={LOGO_URL} alt="RestoCare" className="h-9 w-auto object-contain" />
        </Link>

        {/* Primary nav */}
        <nav className="ml-2 hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Location picker */}
        <button
          onClick={location.detect}
          title="Use my current location"
          className="ml-auto hidden max-w-[14rem] items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-left transition hover:border-gray-300 sm:flex"
        >
          <MapPinIcon className="h-4 w-4 shrink-0 text-gray-500" />
          <span className="truncate text-sm text-gray-700">
            {location.loading ? "Detecting…" : location.label}
          </span>
          {location.loading ? (
            <SpinnerIcon className="h-4 w-4 shrink-0 text-gray-400" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 shrink-0 text-gray-400" />
          )}
        </button>

        {/* Search + live dropdown */}
        <div
          ref={boxRef}
          className="relative w-full max-w-xs sm:ml-2 sm:w-auto sm:flex-1 sm:max-w-sm"
        >
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search for services or categories"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
          />

          {showDropdown && (
            <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-2 shadow-xl">
              {!hasResults ? (
                <div className="px-3 py-6 text-center text-sm text-gray-500">
                  No matches for “{search.trim()}”
                </div>
              ) : (
                <>
                  {matchedCategories.length > 0 && (
                    <div className="mb-1">
                      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Categories
                      </p>
                      {matchedCategories.map((c) => (
                        <Link
                          key={`c-${c.categoryId}`}
                          href={`/category/${c.categoryId}`}
                          onClick={close}
                          className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-gray-50"
                        >
                          <Thumb src={c.profileImage} fallback={emojiFor(c.name)} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {c.name}
                            </p>
                            <p className="truncate text-xs text-gray-400">
                              Category · {c.serviceCount} services
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-medium text-orange-600">
                            View →
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {matchedServices.length > 0 && (
                    <div>
                      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Services
                      </p>
                      {matchedServices.map((s) => (
                        <Link
                          key={`s-${s.serviceId}`}
                          href={`/category/${s.categoryId}?q=${encodeURIComponent(s.name)}`}
                          onClick={close}
                          className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-gray-50"
                        >
                          <Thumb src={s.profileImage} fallback={emojiFor(s.categoryName)} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {s.name}
                            </p>
                            <p className="truncate text-xs text-gray-400">
                              in {s.categoryName}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-gray-900">
                            {formatPrice(s.price)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-label="Cart"
            onClick={openMini}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
          >
            <CartIcon className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold leading-none text-white">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>
          {isLoggedIn ? (
            <Link
              href="/account"
              title={`My account${user?.name ? ` (${user.name})` : user?.mobile ? ` (${user.mobile})` : ""}`}
              aria-label="My account"
              className="flex h-10 items-center rounded-full px-1 text-gray-700 transition hover:bg-gray-100"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                {(user?.name ?? user?.mobile ?? "U").slice(0, 1).toUpperCase()}
              </span>
            </Link>
          ) : (
            <Link
              href="/account/login"
              aria-label="Account"
              className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
            >
              <UserCircleIcon className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Thumb({ src, fallback }: { src: string | null; fallback: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- external image
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-lg">{fallback}</span>
      )}
    </div>
  );
}
