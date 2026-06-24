/**
 * Restaurant chemical products catalog.
 *
 * The backend has no product/catalog endpoint yet, so this is a static catalog
 * exposed behind small async accessors that mimic an API. When a real endpoint
 * lands, replace the bodies of `listProducts` / `getProduct` with `apiClient`
 * calls — callers (pages, hooks) won't need to change.
 */

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  /** Short one-liner for cards. */
  tagline: string;
  description: string;
  price: number; // INR
  mrp?: number; // optional strike-through price
  unit: string; // e.g. "5 L can"
  image: string;
  inStock: boolean;
  rating: number;
  features: string[];
  specs: { label: string; value: string }[];
}

export type ProductCategory =
  | "Cleaning"
  | "Degreasers"
  | "Sanitizers"
  | "Dishwash"
  | "Floor Care";

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Cleaning",
  "Degreasers",
  "Sanitizers",
  "Dishwash",
  "Floor Care",
];

const IMG = (q: string) =>
  `https://images.unsplash.com/${q}?auto=format&fit=crop&w=800&q=80`;

const PRODUCTS: Product[] = [
  {
    id: "dishwash-liquid-5l",
    name: "Heavy-Duty Dishwash Liquid",
    category: "Dishwash",
    tagline: "Cuts grease in seconds",
    description:
      "Concentrated commercial-grade dishwash liquid formulated for high-volume kitchens. Removes tough grease and food residue while being gentle on hands. Rinses clean with no streaks.",
    price: 480,
    mrp: 600,
    unit: "5 L can",
    image: IMG("photo-1585421514738-01798e348b17"),
    inStock: true,
    rating: 4.7,
    features: ["Concentrated formula", "Tough on grease", "Skin-friendly", "No residue"],
    specs: [
      { label: "Volume", value: "5 Litres" },
      { label: "Form", value: "Liquid" },
      { label: "Fragrance", value: "Lemon" },
      { label: "pH", value: "7.0 (Neutral)" },
    ],
  },
  {
    id: "kitchen-degreaser-5l",
    name: "Kitchen Degreaser Spray",
    category: "Degreasers",
    tagline: "For grills, hoods & exhausts",
    description:
      "Industrial degreaser that dissolves baked-on oil, carbon and grime from grills, range hoods, exhaust filters and floors. Fast-acting and food-area safe when rinsed as directed.",
    price: 650,
    mrp: 820,
    unit: "5 L can",
    image: IMG("photo-1563453392212-326f5e854473"),
    inStock: true,
    rating: 4.8,
    features: ["Dissolves baked-on grease", "Fast-acting", "Multi-surface", "Heavy-duty"],
    specs: [
      { label: "Volume", value: "5 Litres" },
      { label: "Form", value: "Liquid spray" },
      { label: "Use on", value: "Grills, hoods, floors" },
      { label: "Contact time", value: "3–5 min" },
    ],
  },
  {
    id: "surface-sanitizer-5l",
    name: "Food-Safe Surface Sanitizer",
    category: "Sanitizers",
    tagline: "Kills 99.9% of germs",
    description:
      "No-rinse sanitizer for food-contact surfaces, prep tables and equipment. Kills 99.9% of bacteria and viruses, leaving surfaces hygienically clean and ready to use.",
    price: 540,
    mrp: 680,
    unit: "5 L can",
    image: IMG("photo-1584305574647-0cc949a2bb9f"),
    inStock: true,
    rating: 4.6,
    features: ["No-rinse formula", "Food-contact safe", "Kills 99.9% germs", "Odourless"],
    specs: [
      { label: "Volume", value: "5 Litres" },
      { label: "Form", value: "Liquid" },
      { label: "Kill rate", value: "99.9%" },
      { label: "Rinse", value: "Not required" },
    ],
  },
  {
    id: "floor-cleaner-5l",
    name: "Anti-Slip Floor Cleaner",
    category: "Floor Care",
    tagline: "Degreases & protects tiles",
    description:
      "Daily-use floor cleaner that removes grease films that cause slips in busy kitchens. Leaves a fresh fragrance and a streak-free, non-sticky finish on tiles and stone.",
    price: 420,
    mrp: 520,
    unit: "5 L can",
    image: IMG("photo-1581578731548-c64695cc6952"),
    inStock: true,
    rating: 4.5,
    features: ["Anti-slip", "Streak-free", "Fresh fragrance", "Daily use"],
    specs: [
      { label: "Volume", value: "5 Litres" },
      { label: "Form", value: "Liquid concentrate" },
      { label: "Dilution", value: "1:40" },
      { label: "Fragrance", value: "Floral" },
    ],
  },
  {
    id: "glass-cleaner-1l",
    name: "Streak-Free Glass Cleaner",
    category: "Cleaning",
    tagline: "Crystal-clear shine",
    description:
      "Ready-to-use glass and mirror cleaner that wipes away smudges, fingerprints and grease for a crystal-clear, streak-free shine on windows, display counters and glassware.",
    price: 180,
    mrp: 240,
    unit: "1 L spray bottle",
    image: IMG("photo-1610557892470-55d9e80c0bce"),
    inStock: true,
    rating: 4.4,
    features: ["Ready to use", "Streak-free", "Quick-dry", "Ammonia-light"],
    specs: [
      { label: "Volume", value: "1 Litre" },
      { label: "Form", value: "Trigger spray" },
      { label: "Use on", value: "Glass, mirrors, steel" },
      { label: "Dry time", value: "< 30 sec" },
    ],
  },
  {
    id: "hand-wash-5l",
    name: "Antibacterial Hand Wash",
    category: "Sanitizers",
    tagline: "Gentle, all-day protection",
    description:
      "Refill-size antibacterial hand wash for staff hygiene stations. Removes germs without drying out skin, with a mild fresh scent suitable for frequent kitchen use.",
    price: 360,
    mrp: 450,
    unit: "5 L refill",
    image: IMG("photo-1588405748880-12d1d2a59f75"),
    inStock: true,
    rating: 4.6,
    features: ["Antibacterial", "Moisturising", "Refill size", "Mild scent"],
    specs: [
      { label: "Volume", value: "5 Litres" },
      { label: "Form", value: "Liquid" },
      { label: "Fragrance", value: "Aloe" },
      { label: "Refill", value: "Yes" },
    ],
  },
  {
    id: "drain-cleaner-1l",
    name: "Drain & Pipe Cleaner",
    category: "Cleaning",
    tagline: "Clears blocks fast",
    description:
      "Powerful drain cleaner that dissolves grease, food waste and organic build-up to clear slow and blocked kitchen drains. Keeps lines flowing and odour-free.",
    price: 220,
    mrp: 290,
    unit: "1 L bottle",
    image: IMG("photo-1607613009820-a29f7bb81c04"),
    inStock: false,
    rating: 4.3,
    features: ["Dissolves blockages", "Odour control", "Fast-acting", "Pipe-safe"],
    specs: [
      { label: "Volume", value: "1 Litre" },
      { label: "Form", value: "Gel" },
      { label: "Contact time", value: "15–30 min" },
      { label: "Use on", value: "Kitchen drains" },
    ],
  },
  {
    id: "steel-polish-1l",
    name: "Stainless Steel Polish",
    category: "Cleaning",
    tagline: "Shine without fingerprints",
    description:
      "Cleans, polishes and protects stainless steel equipment in one step. Removes fingerprints and water marks, leaving a smudge-resistant protective film.",
    price: 260,
    mrp: 330,
    unit: "1 L spray",
    image: IMG("photo-1556910103-1c02745aae4d"),
    inStock: true,
    rating: 4.5,
    features: ["Anti-fingerprint", "Protective film", "One-step", "Streak-free"],
    specs: [
      { label: "Volume", value: "1 Litre" },
      { label: "Form", value: "Spray" },
      { label: "Use on", value: "Stainless steel" },
      { label: "Finish", value: "Satin shine" },
    ],
  },
];

/** Simulated network latency so loading states behave like the real thing. */
const tick = () => new Promise<void>((r) => setTimeout(r, 150));

export async function listProducts(): Promise<Product[]> {
  await tick();
  return PRODUCTS;
}

export async function getProduct(id: string): Promise<Product | null> {
  await tick();
  return PRODUCTS.find((p) => p.id === id) ?? null;
}

/** Synchronous lookup for places that already hold the list (e.g. the cart). */
export function findProductSync(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function formatInr(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}
