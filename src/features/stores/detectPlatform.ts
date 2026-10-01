export type Platform = "shopify" | "generic";

export type PlatformSignals = {
  // Body of /products.json?limit=1 when it returned 2xx, else null.
  productsJson: string | null;
  homepageHeaders: Record<string, string> | null;
  homepageHtml: string | null;
};

export type PlatformResult = {
  platform: Platform;
  // Whether the catalog can be read from /products.json (Phase 2 needs this;
  // a Shopify store that blocks it falls back to the sitemap + JSON-LD).
  productsJsonAvailable: boolean;
  evidence: "products.json" | "headers" | "assets" | "none";
};

function isProductsJson(body: string): boolean {
  try {
    const parsed: unknown = JSON.parse(body);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      Array.isArray((parsed as { products?: unknown }).products)
    );
  } catch {
    return false;
  }
}

// Response headers only Shopify's edge sets. Header keys arrive lowercased.
const SHOPIFY_HEADER_KEYS = ["x-shopid", "x-shopify-stage", "x-sorting-hat-shopid"];

function hasShopifyHeaders(headers: Record<string, string>): boolean {
  if (SHOPIFY_HEADER_KEYS.some((key) => key in headers)) return true;
  return /shopify/i.test(headers["powered-by"] ?? "");
}

/**
 * Decide a store's platform. A valid /products.json is the defining signal;
 * Shopify response headers or cdn.shopify.com assets on the homepage are the
 * fallback (the store is Shopify but has locked the JSON endpoint down).
 */
export function classifyPlatform(signals: PlatformSignals): PlatformResult {
  if (signals.productsJson !== null && isProductsJson(signals.productsJson)) {
    return { platform: "shopify", productsJsonAvailable: true, evidence: "products.json" };
  }
  if (signals.homepageHeaders && hasShopifyHeaders(signals.homepageHeaders)) {
    return { platform: "shopify", productsJsonAvailable: false, evidence: "headers" };
  }
  if (signals.homepageHtml && /cdn\.shopify\.com|\/cdn\/shop\//.test(signals.homepageHtml)) {
    return { platform: "shopify", productsJsonAvailable: false, evidence: "assets" };
  }
  return { platform: "generic", productsJsonAvailable: false, evidence: "none" };
}

// Signs a non-Shopify homepage sells products. Calibrated 2026-10-01 against
// real homepages: stores (everlane, skullcandy, weber, casper, awaytravel,
// purple, saatva, glossier, brooklinen, bollandbranch) all show at least one;
// SaaS sites (linear, notion, figma, vercel, stripe, hubspot, mailchimp,
// intercom, slack, acquire, equidam, trustmrr) show none. Deliberately left
// out: JSON-LD Offer prices (SaaS pricing uses them), "checkout" links (Stripe)
// and platform names in body text (Mailchimp mentions Squarespace Commerce).
const STORE_SIGNALS: RegExp[] = [
  /add[\s-]to[\s-](cart|bag|basket)/i,
  /href=["'](?:https?:\/\/[^"'/]+)?\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(cart|bag|basket|shopping-bag|shopping-cart)(\/|\?|["'#])/i,
  /cdn\.shopify\.com|\/cdn\/shop\/|wp-content\/plugins\/woocommerce|\bwoocommerce-(?:page|cart|js)\b|cdn11\.bigcommerce\.com|\/static\/version\d+\/frontend\/|Magento_|demandware\.static|\/on\/demandware\.store\/|wixstores|ecwid\.com\/script|prestashop/i,
];

/** Does this homepage look like an online store (cart, add-to-cart, or a store platform's assets)? */
export function looksLikeStore(homepageHtml: string): boolean {
  return STORE_SIGNALS.some((re) => re.test(homepageHtml));
}
