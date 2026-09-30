import { CATALOG_CONFIG } from "./config";
import type { CatalogProduct } from "./types";

export type CatalogStats = {
  productCount: number;
  // Of products we have variant data for:
  onSaleCount: number;
  soldOutCount: number;
  avgPrice: number | null; // cents, over each product's cheapest variant
};

export type ReportItem = {
  id: string;
  title: string;
  handle: string;
  image: string | null;
  price: number | null;
  compareAtPrice?: number | null;
  pctOff?: number;
  launchedAt?: string;
};

export type FirstReport = {
  stats: CatalogStats;
  recentlyLaunched: ReportItem[];
  onSaleNow: ReportItem[];
  soldOut: ReportItem[];
};

const minPrice = (p: CatalogProduct) =>
  p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : null;

// A product's best discount: the variant furthest below its compare-at price.
function bestDiscount(p: CatalogProduct) {
  let best: { pct: number; price: number; compareAt: number } | null = null;
  for (const v of p.variants) {
    if (v.compareAtPrice === null || v.compareAtPrice <= v.price) continue;
    const pct = Math.round(((v.compareAtPrice - v.price) / v.compareAtPrice) * 100);
    if (!best || pct > best.pct) best = { pct, price: v.price, compareAt: v.compareAtPrice };
  }
  return best;
}

const isSoldOut = (p: CatalogProduct) => p.variants.length > 0 && p.variants.every((v) => !v.available);

const item = (p: CatalogProduct): ReportItem => ({
  id: p.id,
  title: p.title,
  handle: p.handle,
  image: p.image,
  price: minPrice(p),
});

export function catalogStats(products: CatalogProduct[]): CatalogStats {
  const priced = products.map(minPrice).filter((n): n is number => n !== null);
  return {
    productCount: products.length,
    onSaleCount: products.filter((p) => bestDiscount(p) !== null).length,
    soldOutCount: products.filter(isSoldOut).length,
    avgPrice: priced.length ? Math.round(priced.reduce((a, b) => a + b, 0) / priced.length) : null,
  };
}

/**
 * The instant snapshot a user gets right after adding a competitor
 * (SPEC.md §5 Phase 2): what launched recently, what's on sale now, what's
 * sold out — straight from the first catalog read, no history needed.
 */
export function buildFirstReport(products: CatalogProduct[], now: Date = new Date()): FirstReport {
  const limit = CATALOG_CONFIG.firstReportLimit;
  const cutoff = now.getTime() - CATALOG_CONFIG.firstReportRecentDays * 24 * 60 * 60 * 1000;

  const recentlyLaunched = products
    .map((p) => ({ p, at: p.publishedAt ?? p.createdAt }))
    .filter(({ at }) => at !== null && Date.parse(at) >= cutoff && Date.parse(at) <= now.getTime())
    .sort((a, b) => Date.parse(b.at!) - Date.parse(a.at!))
    .slice(0, limit)
    .map(({ p, at }) => ({ ...item(p), launchedAt: at! }));

  const onSaleNow = products
    .map((p) => ({ p, d: bestDiscount(p) }))
    .filter(({ p, d }) => d !== null && !isSoldOut(p))
    .sort((a, b) => b.d!.pct - a.d!.pct)
    .slice(0, limit)
    .map(({ p, d }) => ({ ...item(p), price: d!.price, compareAtPrice: d!.compareAt, pctOff: d!.pct }));

  const soldOut = products.filter(isSoldOut).slice(0, limit).map(item);

  return { stats: catalogStats(products), recentlyLaunched, onSaleNow, soldOut };
}
