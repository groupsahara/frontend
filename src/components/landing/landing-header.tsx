"use client";

import Link from "next/link";
import { useCurrentLocation } from "@/src/lib/location";
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

interface LandingHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function LandingHeader({ search, onSearchChange }: LandingHeaderProps) {
  const location = useCurrentLocation();

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

        {/* Search */}
        <div className="relative w-full max-w-xs sm:ml-2 sm:w-auto sm:flex-1 sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search for services or vendors"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
          />
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-label="Cart"
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
          >
            <CartIcon className="h-5 w-5" />
          </button>
          <Link
            href="/login"
            aria-label="Account"
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
          >
            <UserCircleIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
