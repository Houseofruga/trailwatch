import { parse } from "tldts";
import { fetchRobotsTxt, robotsAllows } from "@/features/checks/fetchPage";
import { safeFetch } from "@/features/lastUpdated/fetch";
import { classifyPlatform, looksLikeStore, type PlatformResult } from "@/features/stores/detectPlatform";
import { canonicalStoreHost, storeNameFrom } from "@/features/stores/domain";

// Public tool T1 (SEO_PLAN.md): "Is this site on Shopify?". Same detection as
// adding a store, without touching the database. Results are cached per
// domain for a day so one site isn't fetched over and over.

export type ShopifyCheck =
  | {
      ok: true;
      host: string;
      name: string;
      verdict: "shopify" | "other-store" | "not-a-store" | "unknown";
      /** A non-Shopify store platform we recognised, e.g. "WooCommerce". */
      platformName: string | null;
      /** Plain-English reasons, strongest first. */
      evidence: string[];
      /** Shopify with a public catalog: TrailWatch can track every product. */
      catalogPublic: boolean;
    }
  | { ok: false; message: string };

const OTHER_PLATFORMS: { name: string; re: RegExp }[] = [
  { name: "WooCommerce", re: /wp-content\/plugins\/woocommerce|\bwoocommerce-(?:page|cart|js)\b/i },
  { name: "BigCommerce", re: /cdn11\.bigcommerce\.com/i },
  { name: "Magento (Adobe Commerce)", re: /\/static\/version\d+\/frontend\/|Magento_/i },
  { name: "Salesforce Commerce Cloud", re: /demandware\.static|\/on\/demandware\.store\//i },
  { name: "Wix", re: /wixstores|static\.wixstatic\.com/i },
  { name: "Squarespace", re: /static1\.squarespace\.com/i },
  { name: "Ecwid", re: /ecwid\.com\/script/i },
  { name: "PrestaShop", re: /var prestashop\s*=/i },
];

/** The store platform a homepage's assets point to, other than Shopify. */
export function otherPlatform(html: string): string | null {
  return OTHER_PLATFORMS.find((p) => p.re.test(html))?.name ?? null;
}

const EVIDENCE: Record<PlatformResult["evidence"], string> = {
  "products.json": "Its product catalog is public at /products.json, a Shopify-only address.",
  headers: "Its web server sends headers that only Shopify's servers send.",
  assets: "Its pages load files from Shopify's CDN.",
  none: "",
};

/** Pure: turn what we fetched into the tool's answer. */
export function explain(input: {
  host: string;
  name: string;
  platform: PlatformResult;
  homepageHtml: string | null;
}): Extract<ShopifyCheck, { ok: true }> {
  const { host, name, platform, homepageHtml } = input;
  if (platform.platform === "shopify") {
    return {
      ok: true,
      host,
      name,
      verdict: "shopify",
      platformName: "Shopify",
      evidence: [EVIDENCE[platform.evidence]],
      catalogPublic: platform.productsJsonAvailable,
    };
  }
  if (homepageHtml === null) {
    return { ok: true, host, name, verdict: "unknown", platformName: null, evidence: [], catalogPublic: false };
  }
  const other = otherPlatform(homepageHtml);
  const store = other !== null || looksLikeStore(homepageHtml);
  return {
    ok: true,
    host,
    name,
    verdict: store ? "other-store" : "not-a-store",
    platformName: other,
    evidence: [
      "There's no public /products.json catalog, and no Shopify headers or files.",
      ...(other ? [`Its pages load files from ${other}.`] : []),
    ],
    catalogPublic: false,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;
// Per server instance, like the homepage finder's rate limit (BACKLOG.md).
const cache = new Map<string, { at: number; result: ShopifyCheck }>();

export async function checkShopify(input: string): Promise<ShopifyCheck> {
  const host = canonicalStoreHost(input);
  if (!host) return { ok: false, message: "Enter a website like dewlane.com." };

  const hit = cache.get(host);
  if (hit && Date.now() - hit.at < DAY_MS) return hit.result;

  const robots = await fetchRobotsTxt(`https://${host}`);
  const [home, productsJson] = await Promise.all([
    robotsAllows(robots, "/") ? safeFetch(`https://${host}/`) : null,
    robotsAllows(robots, "/products.json?limit=1")
      ? safeFetch(`https://${host}/products.json?limit=1`, { maxBytes: 500_000 })
      : null,
  ]);

  let result: ShopifyCheck;
  if (!home?.ok && !productsJson?.ok) {
    result = { ok: false, message: "We couldn't open that site. Check the address and try again." };
  } else if (home?.ok && parse(new URL(home.finalUrl).hostname).domain !== parse(host).domain) {
    const other = new URL(home.finalUrl).hostname.replace(/^www\./, "");
    result = { ok: false, message: `${host} sends visitors to ${other}. Try checking ${other} instead.` };
  } else {
    const platform = classifyPlatform({
      productsJson: productsJson?.ok ? productsJson.html : null,
      homepageHeaders: home?.ok ? home.headers : null,
      homepageHtml: home?.ok ? home.html : null,
    });
    result = explain({
      host,
      name: storeNameFrom(home?.ok ? home.html : null, host),
      platform,
      homepageHtml: home?.ok ? home.html : null,
    });
  }

  // Don't remember "couldn't open": it's often a one-off.
  if (result.ok) cache.set(host, { at: Date.now(), result });
  return result;
}
