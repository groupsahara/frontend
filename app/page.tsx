"use client";

import { useEffect, useState } from "react";
import { LandingHeader } from "@/src/components/landing/landing-header";
import { Hero } from "@/src/components/landing/hero";
import { PopularCategories } from "@/src/components/landing/popular-categories";
import { VendorGrid } from "@/src/components/landing/vendor-grid";

export default function Home() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);

  // Debounce the search input so the vendor query isn't refetched on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  return (
    <div data-theme="light" className="min-h-dvh bg-white">
      <LandingHeader search={search} onSearchChange={setSearch} />
      <main>
        <Hero />
        <PopularCategories selectedCategoryId={categoryId} onSelect={setCategoryId} />
        <VendorGrid search={debouncedSearch} categoryId={categoryId} />
      </main>

      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-gray-500 sm:px-6">
          © {new Date().getFullYear()} RestoCare. Home services at your doorstep.
        </div>
      </footer>
    </div>
  );
}
