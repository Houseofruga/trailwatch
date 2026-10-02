import { parse } from "tldts";
import { fetchRobotsTxt, robotsAllows } from "@/features/checks/fetchPage";
import { CATALOG_CONFIG } from "@/features/catalog/config";
import { fetchShopifyCatalog } from "@/features/catalog/fetchCatalog";
import { buildFirstReport, isHelperProduct, type ReportItem } from "@/features/catalog/firstReport";
import type { CatalogProduct } from "@/features/catalog/types";
import { safeFetch } from "@/features/lastUpdated/fetch";
import { canonicalStoreHost, storeNameFrom } from "@/features/stores/domain";
import { isMarketplace, MARKETPLACE_MESSAGE } from "@/features/stores/denylist.config";

// Public tools T2 (store snapshot) and T3 (sale checker), SEO_PLAN.md: one
// read of a store's public catalog, summarised. Capped at TOOL_PAGES pages so
// a check stays quick and polite; cached a day per store, shared by both tools.

const TOOL_PAGES = 4; // 4 × 250 = the first 1,000 products
const LIST = 5;

export type SaleVerdict = "sitewide" | "some" | "none";

export type StoreSnapshot = {
  ok: true;
  host: string;
  name: string;
  /** False when the store has more products than we read (we show "1,000+"). */
  complete: boolean;
  productCount: number;
  priceRange: { min: number; max: number } | null;
  avgPrice: number | null;
  soldOutCount: number;
  sale: {
    verdict: SaleVerdict;
    count: number;
    /** Share of in-stock products on sale, 0–100. */
    share: number;
    avgPctOff: number | null;
    maxPctOff: number | null;
    top: ReportItem[];
  };
  launched: { count: number; top: ReportItem[] };
};

export type SnapshotResult = StoreSnapshot | { ok: false; message: string };

/** Pure: a catalog read → the snapshot both tools show. */
export function summarize(input: {
  host: string;
  name: string;
  products: CatalogProduct[];
  complete: boolean;
  now?: Date;
}): StoreSnapshot {
  const report = buildFirstReport(input.products, input.now);
  // Each product's cheapest variant, add-ons (shipping protection, gift wrap) left out, as in its stats.
  const priced = input.products
    .filter((p) => !isHelperProduct(p) && p.variants.length > 0)
    .map((p) => Math.min(...p.variants.map((v) => v.price)))
    .filter((n) => n > 0);
  const inStock = report.stats.productCount - report.stats.soldOutCount;
  const onSale = report.totals.onSaleNow;
  const pcts = report.onSaleNow.map((i) => i.pctOff ?? 0);
  const share = inStock > 0 ? Math.round((onSale / inStock) * 100) : 0;
  const sitewide = onSale >= CATALOG_CONFIG.sitewideSaleMinProducts && share >= CATALOG_CONFIG.sitewideSaleShare * 100;
  return {
    ok: true,
    host: input.host,
    name: input.name,
    complete: input.complete,
    productCount: report.stats.productCount,
    priceRange: priced.length ? { min: Math.min(...priced), max: Math.max(...priced) } : null,
    avgPrice: report.stats.avgPrice,
    soldOutCount: report.stats.soldOutCount,
    sale: {
      verdict: sitewide ? "sitewide" : onSale > 0 ? "some" : "none",
      count: onSale,
      share,
      avgPctOff: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null,
      maxPctOff: pcts.length ? Math.max(...pcts) : null,
      top: report.onSaleNow.slice(0, LIST),
    },
    launched: { count: report.totals.recentlyLaunched, top: report.recentlyLaunched.slice(0, LIST) },
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Per server instance, like the other tools' rate limit (BACKLOG.md).
const cache = new Map<string, { at: number; result: StoreSnapshot }>();

const NOT_READABLE = (host: string) =>
  `We couldn't read a public product catalog at ${host}. This works with Shopify stores that publish theirs. Check it with the Shopify store checker.`;

export async function storeSnapshot(input: string): Promise<SnapshotResult> {
  const host = canonicalStoreHost(input);
  if (!host) return { ok: false, message: "Enter a store like dewlane.com." };
  if (isMarketplace(host)) return { ok: false, message: MARKETPLACE_MESSAGE };

  const hit = cache.get(host);
  if (hit && Date.now() - hit.at < DAY_MS) return hit.result;

  const robots = await fetchRobotsTxt(`https://${host}`);
  if (!robotsAllows(robots, `/products.json?limit=${CATALOG_CONFIG.pageSize}&page=1`)) {
    return { ok: false, message: `${host} asks tools like ours not to read its catalog, so we don't.` };
  }

  const home = robotsAllows(robots, "/") ? await safeFetch(`https://${host}/`) : null;
  if (home?.ok && parse(new URL(home.finalUrl).hostname).domain !== parse(host).domain) {
    const other = new URL(home.finalUrl).hostname.replace(/^www\./, "");
    return { ok: false, message: `${host} sends visitors to ${other}. Try ${other} instead.` };
  }

  // The homepage's final origin first (usually www.), then the bare domain.
  const origins = [...new Set([home?.ok ? new URL(home.finalUrl).origin : null, `https://${host}`, `https://www.${host}`])].filter(
    (o): o is string => o !== null,
  );
  for (const origin of origins) {
    const res = await fetchShopifyCatalog(origin, { config: { maxPages: TOOL_PAGES } });
    if (!res.ok) continue;
    if (res.catalog.products.length === 0) break;
    const result = summarize({
      host,
      name: storeNameFrom(home?.ok ? home.html : null, host),
      products: res.catalog.products,
      complete: res.catalog.complete,
    });
    cache.set(host, { at: Date.now(), result });
    return result;
  }
  if (!home?.ok) return { ok: false, message: "We couldn't open that site. Check the address and try again." };
  return { ok: false, message: NOT_READABLE(host) };
}
