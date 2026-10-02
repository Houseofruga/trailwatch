import { describe, expect, it } from "vitest";
import type { CatalogProduct } from "@/features/catalog/types";
import { summarize } from "./storeSnapshot";

const now = new Date("2026-10-02T12:00:00Z");
const product = (id: string, price: number, opts: { compareAt?: number; soldOut?: boolean; createdAt?: string } = {}): CatalogProduct => ({
  id,
  handle: id,
  title: `Product ${id}`,
  productType: "",
  tags: [],
  vendor: "",
  createdAt: opts.createdAt ?? "2025-01-01T00:00:00Z",
  publishedAt: null,
  image: null,
  variants: [{ id: `${id}-v`, title: "", sku: null, price, compareAtPrice: opts.compareAt ?? null, available: !opts.soldOut }],
});

describe("store snapshot", () => {
  it("counts products, price range, sold out, launches and the sale", () => {
    const products = [
      product("a", 2000, { compareAt: 4000 }),
      product("b", 3000, { compareAt: 4000 }),
      product("c", 5000),
      product("d", 1000, { soldOut: true }),
      product("e", 8000, { createdAt: "2026-09-25T00:00:00Z" }),
    ];
    const s = summarize({ host: "dewlane.com", name: "Dewlane", products, complete: true, now });
    expect(s.productCount).toBe(5);
    expect(s.priceRange).toEqual({ min: 1000, max: 8000 });
    expect(s.soldOutCount).toBe(1);
    expect(s.launched.count).toBe(1);
    // 2 of 4 in-stock products on sale = 50%, but under the 5-product sitewide minimum.
    expect(s.sale).toMatchObject({ verdict: "some", count: 2, share: 50, maxPctOff: 50, avgPctOff: 38 });
    expect(s.sale.top[0].id).toBe("a");
  });

  it("calls it sitewide when enough of the in-stock catalog is discounted", () => {
    const products = Array.from({ length: 10 }, (_, i) => product(`p${i}`, 3000, i < 6 ? { compareAt: 4000 } : {}));
    expect(summarize({ host: "x.com", name: "X", products, complete: false, now }).sale.verdict).toBe("sitewide");
  });

  it("leaves checkout add-ons out of the counts and the price range", () => {
    const addOn = { ...product("r", 80), title: "Free Returns Coverage", productType: "return,package_protection" };
    const s = summarize({ host: "x.com", name: "X", products: [addOn, product("a", 1200)], complete: true, now });
    expect(s.productCount).toBe(1);
    expect(s.priceRange).toEqual({ min: 1200, max: 1200 });
  });

  it("finds no sale when nothing is discounted", () => {
    const s = summarize({ host: "x.com", name: "X", products: [product("a", 1000)], complete: true, now });
    expect(s.sale).toMatchObject({ verdict: "none", count: 0, avgPctOff: null, maxPctOff: null });
  });
});
