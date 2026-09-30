import * as cheerio from "cheerio";

export type StorePageKind = "homepage" | "sale" | "shipping_policy" | "refund_policy";

// Shopify serves store policies at fixed paths. Default robots.txt disallows
// /policies/, so these are usually skipped — we honor robots.
export const SHOPIFY_POLICY_PATHS: { kind: StorePageKind; path: string }[] = [
  { kind: "shipping_policy", path: "/policies/shipping-policy" },
  { kind: "refund_policy", path: "/policies/refund-policy" },
];

// Probed (in order) on Shopify stores whose homepage links to no sale page.
export const SHOPIFY_SALE_FALLBACK_PATHS = ["/collections/sale", "/collections/all"];

// Lower = better. A literal "sale" collection beats "summer-sale", which beats
// clearance/outlet-style pages, which beat the catch-all "all" collection.
function saleRank(slug: string): number | null {
  const s = slug.toLowerCase();
  if (s === "sale" || s === "sales") return 0;
  if (/(^|[-_])sales?($|[-_])/.test(s)) return 1;
  if (/clearance|outlet|offers?|deals?|promo/.test(s)) return 2;
  if (s === "all") return 3;
  return null;
}

// Optional locale prefix (/en, /en-us) before the collection or top-level path.
const LOCALE = String.raw`(?:/[a-z]{2}(?:-[a-z]{2})?)?`;
const COLLECTION_PATH = new RegExp(String.raw`^${LOCALE}/collections/([^/]+)/?$`, "i");
const TOP_LEVEL_PATH = new RegExp(String.raw`^${LOCALE}/(?:shop/)?([^/]+)/?$`, "i");

/**
 * Find the store's sale/collection page from the links on its homepage (nav,
 * banners, footer). Only same-host links count. Shopify collection URLs are
 * matched by handle; other platforms by a top-level /sale-style path — except
 * "all", which is only meaningful as a Shopify collection. Returns the best
 * path (without query/hash) or null.
 */
export function findSalePagePath(homepageHtml: string, origin: string): string | null {
  const $ = cheerio.load(homepageHtml);
  const host = new URL(origin).hostname.replace(/^www\./, "");
  const candidates: { path: string; rank: number }[] = [];

  $("a[href]").each((_, el) => {
    let url: URL;
    try {
      url = new URL($(el).attr("href") ?? "", origin);
    } catch {
      return;
    }
    if (url.hostname.replace(/^www\./, "") !== host) return;

    const path = url.pathname;
    const collection = COLLECTION_PATH.exec(path);
    const topLevel = collection ? null : TOP_LEVEL_PATH.exec(path);
    const slug = collection?.[1] ?? topLevel?.[1];
    if (!slug) return;

    let decoded: string;
    try {
      decoded = decodeURIComponent(slug);
    } catch {
      return; // malformed %-escape
    }
    const rank = saleRank(decoded);
    if (rank === null || (topLevel && rank === 3)) return;
    // Shopify Markets serves locale-prefixed links (/en-in/collections/all) based
    // on where the request came from; store the unprefixed collection so we
    // watch the store's default storefront, not whichever market we landed in.
    const clean = collection ? `/collections/${slug}` : path.replace(/\/$/, "");
    candidates.push({ path: clean, rank });
  });

  // Best rank wins; on a tie, the link that appears first on the page (nav first).
  const best = candidates.reduce<(typeof candidates)[number] | null>(
    (acc, c) => (acc === null || c.rank < acc.rank ? c : acc),
    null,
  );
  return best?.path ?? null;
}
