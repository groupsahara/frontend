"use client";

import { useEffect, useState } from "react";
import { LandingHeader } from "@/src/components/landing/landing-header";
import { Hero } from "@/src/components/landing/hero";
import { PopularCategories } from "@/src/components/landing/popular-categories";
import { HowItWorks } from "@/src/components/landing/how-it-works";
import { ServiceGrid } from "@/src/components/landing/service-grid";
import { WhyChooseUs } from "@/src/components/landing/why-choose-us";
import { TopProviders } from "@/src/components/landing/top-providers";
import { RestaurantRepair } from "@/src/components/landing/restaurant-repair";
import { VideoBanner } from "@/src/components/landing/video-banner";
import { PartnerCTA, Testimonials } from "@/src/components/landing/testimonials";
import { FAQs } from "@/src/components/landing/faqs";
import { Footer } from "@/src/components/landing/footer";

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
        <HowItWorks />
        <ServiceGrid search={debouncedSearch} categoryId={categoryId} />
        <WhyChooseUs />
        <TopProviders />
        <RestaurantRepair />
        <VideoBanner />
        <PartnerCTA />
        <Testimonials />
        <FAQs />
      </main>

      <Footer />
    </div>
  );
}
