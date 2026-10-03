// The normalized catalog shape (SPEC.md §5 Phase 2). Prices are integer cents
// so comparisons never trip over float rounding. IDs are strings: Shopify's are
// numeric, the sitemap fallback's are product handles.

export type CatalogVariant = {
  id: string;
  title: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  available: boolean;
};

export type CatalogProduct = {
  id: string;
  handle: string;
  title: string;
  productType: string;
  tags: string[];
  vendor: string;
  createdAt: string | null;
  publishedAt: string | null;
  image: string | null;
  // The first part of the product description as plain text, for the product
  // classifier (matching). Missing in snapshots from before 2026-10-03.
  description?: string;
  // Empty when the product is outside the price-tracked subset: it still counts
  // for launches/removals, but produces no price/sale/stock events.
  variants: CatalogVariant[];
};

export type CatalogSource = "products.json" | "sitemap";

export type Catalog = {
  source: CatalogSource;
  products: CatalogProduct[];
  // False when we stopped early on purpose (page ceiling). Removals are only
  // inferred from a complete catalog.
  complete: boolean;
};
