import { z } from "zod";
import { hashContent } from "@/features/checks/hash";
import type { CatalogProduct, CatalogVariant } from "./types";

// Money strings ("25.00") → integer cents. Null for missing/zero/garbage, which
// is how Shopify says "no compare-at price".
export function toCents(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

const id = z.union([z.string(), z.number()]).transform(String);
const text = z.string().nullish().transform((s) => s?.trim() ?? "");
const date = z.string().nullish().transform((s) => s ?? null);

// Only the fields we keep; everything else (body_html, options, ...) is dropped.
// Shopify has served tags both as an array and as a comma-separated string.
const rawVariant = z.object({
  id,
  title: text,
  sku: z.string().nullish(),
  price: z.unknown().optional(),
  compare_at_price: z.unknown().optional(),
  available: z.boolean().nullish(),
});

const rawProduct = z.object({
  id,
  handle: z.string().min(1),
  title: text,
  product_type: text,
  vendor: text,
  tags: z.union([z.array(z.string()), z.string()]).nullish(),
  created_at: date,
  published_at: date,
  images: z.array(z.object({ src: z.string() })).nullish(),
  // Parsed one by one below, so a single malformed variant doesn't drop the product.
  variants: z.array(z.unknown()).nullish(),
});

/** One raw /products.json product → our shape, or null if it's malformed. */
export function normalizeShopifyProduct(raw: unknown): CatalogProduct | null {
  const parsed = rawProduct.safeParse(raw);
  if (!parsed.success) return null;
  const p = parsed.data;

  const variants: CatalogVariant[] = [];
  for (const rawV of p.variants ?? []) {
    const parsedV = rawVariant.safeParse(rawV);
    if (!parsedV.success) continue;
    const v = parsedV.data;
    const price = toCents(v.price);
    if (price === null) continue; // a variant with no price can't be tracked
    variants.push({
      id: v.id,
      title: v.title,
      sku: v.sku?.trim() || null,
      price,
      compareAtPrice: toCents(v.compare_at_price),
      available: v.available ?? false,
    });
  }

  // Has variants but none with a real price: not merchandise. Bundle/upsell
  // apps and themes park $0 helper "products" in the catalog ("… Bundle
  // Checkout", "Content: Bundle Content Tile" — brooklinen.com, 2026-09-30);
  // they'd otherwise show up as launches. Free gifts go the same way.
  if ((p.variants?.length ?? 0) > 0 && variants.length === 0) return null;

  const tags = Array.isArray(p.tags)
    ? p.tags
    : (p.tags ?? "").split(",");

  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    productType: p.product_type,
    tags: tags.map((t) => t.trim()).filter(Boolean),
    vendor: p.vendor,
    createdAt: p.created_at,
    publishedAt: p.published_at,
    image: p.images?.[0]?.src ?? null,
    variants,
  };
}

/**
 * Keep per-variant data only for the `cap` most recently published products;
 * the rest keep an empty variant list (tracked for launches/removals only).
 */
export function applyPriceTrackCap(products: CatalogProduct[], cap: number): CatalogProduct[] {
  if (products.length <= cap) return products;
  const newestFirst = [...products].sort((a, b) =>
    (b.publishedAt ?? b.createdAt ?? "").localeCompare(a.publishedAt ?? a.createdAt ?? ""),
  );
  const tracked = new Set(newestFirst.slice(0, cap).map((p) => p.id));
  return products.map((p) => (tracked.has(p.id) ? p : { ...p, variants: [] }));
}

/** Order-independent fingerprint of a catalog: equal hash = nothing changed. */
export function hashCatalog(products: CatalogProduct[]): string {
  const sorted = [...products].sort((a, b) => a.id.localeCompare(b.id));
  return hashContent(JSON.stringify(sorted));
}
