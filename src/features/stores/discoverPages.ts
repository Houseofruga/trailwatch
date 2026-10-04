import * as cheerio from "cheerio";

export type StorePageKind = "homepage" | "sale" | "shipping_policy" | "refund_policy";

// Shopify serves store policies at fixed paths. Default robots.txt disallows
// /policies/, so these are usually skipped — we honor robots.
export const SHOPIFY_POLICY_PATHS: { kind: StorePageKind; path: string }[] = [
  { kind: "shipping_policy", path: "/policies/shipping-policy" },
  { kind: "refund_policy", path: "/policies/refund-policy" },
];

// Probed on Shopify stores whose homepage links to no sale page. The catch-all
// "all products" collection is not a sale page, so it isn't a fallback: a store
// without a sale collection gets no sale page (sales still show in its catalog).
export const SHOPIFY_SALE_FALLBACK_PATHS = ["/collections/sale"];

// Lower = better. A literal "sale" collection beats "summer-sale", which beats
// clearance/outlet-style pages.
function saleRank(slug: string): number | null {
  const s = slug.toLowerCase();
  if (s === "sale" || s === "sales") return 0;
  if (/(^|[-_])sales?($|[-_])/.test(s)) return 1;
  if (/clearance|outlet|offers?|deals?|promo/.test(s)) return 2;
  return null;
}

/**
 * A "Page Not Found" screen served with a 200 (a soft 404): some storefronts,
 * headless ones especially, answer OK for addresses that don't exist. Judged by
 * the page title, where every theme says so.
 */
export function isNotFoundPage(html: string): boolean {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "";
  return /\b404\b|not found|page (?:doesn[’']t|does not) exist/i.test(title);
}

// Optional locale prefix (/en, /en-us) before the collection or top-level path.
const LOCALE = String.raw`(?:/[a-z]{2}(?:-[a-z]{2})?)?`;
const COLLECTION_PATH = new RegExp(String.raw`^${LOCALE}/collections/([^/]+)/?$`, "i");
const TOP_LEVEL_PATH = new RegExp(String.raw`^${LOCALE}/(?:shop/)?([^/]+)/?$`, "i");

const PRODUCT_LINK = new RegExp(String.raw`^${LOCALE}(?:/collections/[^/]+)?/products/([^/]+)/?$`, "i");
const MAX_FEATURED = 50;

/**
 * Handles of the products a store features on its homepage — the best proxy
 * for "top product" we have without sales data (a top product selling out is
 * a high-severity event). Same-host /products/<handle> links, in page order.
 */
export function featuredProductHandles(homepageHtml: string, origin: string): string[] {
  const $ = cheerio.load(homepageHtml);
  const host = new URL(origin).hostname.replace(/^www\./, "");
  const handles = new Set<string>();
  $("a[href]").each((_, el) => {
    if (handles.size >= MAX_FEATURED) return false;
    try {
      const url = new URL($(el).attr("href") ?? "", origin);
      if (url.hostname.replace(/^www\./, "") !== host) return;
      const match = PRODUCT_LINK.exec(url.pathname);
      if (match) handles.add(decodeURIComponent(match[1]).toLowerCase());
    } catch {
      // malformed href or %-escape
    }
  });
  return [...handles];
}

/**
 * Find the store's sale/collection page from the links on its homepage (nav,
 * banners, footer). Only same-host links count. Shopify collection URLs are
 * matched by handle; other platforms by a top-level /sale-style path. Returns
 * the best path (without query/hash) or null.
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
    if (rank === null) return;
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

const MAX_LABEL = 60;

/**
 * The collections a store links from its homepage, in page order (the menu
 * comes first): its real shopping categories, unlike the hundreds of campaign
 * and influencer collections a store may publish. Sale pages are left out
 * (watched separately), as is anything in `exclude`. The label is the link's
 * own text, when it has any.
 */
export function menuCollections(homepageHtml: string, origin: string, exclude: string[] = []): { handle: string; label: string }[] {
  const $ = cheerio.load(homepageHtml);
  const host = new URL(origin).hostname.replace(/^www\./, "");
  const skip = new Set(exclude);
  const found = new Map<string, string>();
  $("a[href]").each((_, el) => {
    let handle: string;
    try {
      const url = new URL($(el).attr("href") ?? "", origin);
      if (url.hostname.replace(/^www\./, "") !== host) return;
      const match = COLLECTION_PATH.exec(url.pathname);
      if (!match) return;
      handle = decodeURIComponent(match[1]).toLowerCase();
    } catch {
      return; // malformed href or %-escape
    }
    if (skip.has(handle) || saleRank(handle) !== null) return;
    const label = $(el).text().replace(/\s+/g, " ").trim();
    const usable = label.length > 0 && label.length <= MAX_LABEL ? label : "";
    if (!found.has(handle) || (!found.get(handle) && usable)) found.set(handle, usable);
  });
  return [...found].map(([handle, label]) => ({ handle, label }));
}
