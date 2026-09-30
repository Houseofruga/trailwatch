// Test builders for catalog specs (not imported by app code).
import type { CatalogProduct, CatalogVariant } from "./types";

export function variant(overrides: Partial<CatalogVariant> = {}): CatalogVariant {
  return { id: "v1", title: "Default", sku: null, price: 4800, compareAtPrice: null, available: true, ...overrides };
}

export function product(id: string, overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id,
    handle: `product-${id}`,
    title: `Product ${id}`,
    productType: "Skincare",
    tags: [],
    vendor: "Dewlane",
    createdAt: "2026-01-01T00:00:00Z",
    publishedAt: "2026-01-01T00:00:00Z",
    image: null,
    variants: [variant()],
    ...overrides,
  };
}
