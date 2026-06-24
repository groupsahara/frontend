"use client";

/**
 * Local cart for chemical products.
 *
 * Kept entirely separate from the service/booking cart (`@/src/lib/cart`),
 * which is backend-driven. Products have no order/payment backend yet, so this
 * cart lives in localStorage and "checks out" as a WhatsApp order enquiry.
 * When a product order API exists, swap the checkout call — the cart shape can
 * stay the same.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { findProductSync, type Product } from "@/src/data/products";

const STORAGE_KEY = "rc_product_cart";

export interface ProductCartLine {
  productId: string;
  qty: number;
}

export interface ProductCartItem extends ProductCartLine {
  product: Product;
  lineTotal: number;
}

interface ProductCartValue {
  lines: ProductCartLine[];
  items: ProductCartItem[];
  count: number;
  subtotal: number;
  add: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  qtyOf: (productId: string) => number;
}

const ProductCartContext = createContext<ProductCartValue | null>(null);

function readStored(): ProductCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProductCartLine[]) : [];
  } catch {
    return [];
  }
}

export function ProductCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<ProductCartLine[]>([]);

  // Hydrate from localStorage after mount. The first client render must match
  // the server's empty cart, so we deliberately read the external store in an
  // effect rather than during render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from an external store (localStorage) post-hydration
    setLines(readStored());
  }, []);

  // Persist on change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  const add = useCallback((productId: string, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId ? { ...l, qty: l.qty + qty } : l,
        );
      }
      return [...prev, { productId, qty }];
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => (l.productId === productId ? { ...l, qty } : l)),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<ProductCartValue>(() => {
    const items: ProductCartItem[] = lines
      .map((l) => {
        const product = findProductSync(l.productId);
        if (!product) return null;
        return { ...l, product, lineTotal: product.price * l.qty };
      })
      .filter((x): x is ProductCartItem => x !== null);

    return {
      lines,
      items,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: items.reduce((s, i) => s + i.lineTotal, 0),
      add,
      setQty,
      remove,
      clear,
      qtyOf: (id) => lines.find((l) => l.productId === id)?.qty ?? 0,
    };
  }, [lines, add, setQty, remove, clear]);

  return (
    <ProductCartContext.Provider value={value}>
      {children}
    </ProductCartContext.Provider>
  );
}

export function useProductCart(): ProductCartValue {
  const ctx = useContext(ProductCartContext);
  if (!ctx) {
    throw new Error("useProductCart must be used within a ProductCartProvider");
  }
  return ctx;
}
