import { parse } from "tldts";
import { safeFetch } from "@/features/lastUpdated/fetch";
import { fetchRobotsTxt, robotsAllows } from "@/features/checks/fetchPage";
import { canonicalStoreHost, storeNameFrom } from "./domain";
import { isMarketplace, MARKETPLACE_MESSAGE } from "./denylist.config";
import { classifyPlatform, looksLikeStore, type PlatformResult } from "./detectPlatform";
import {
  findSalePagePath,
  isNotFoundPage,
  SHOPIFY_POLICY_PATHS,
  SHOPIFY_SALE_FALLBACK_PATHS,
  type StorePageKind,
} from "./discoverPages";

export type WatchedPage = { kind: StorePageKind; url: string };
export type SkippedPage = WatchedPage & { reason: "robots" | "not-found" };

export type StoreProbeError = {
  ok: false;
  code: "invalid" | "marketplace" | "unreachable" | "not_store" | "not_shopify";
  message: string;
};

export type StoreProbe =
  | {
      ok: true;
      host: string;
      name: string;
      platform: PlatformResult;
      pages: WatchedPage[];
      // Pages we looked for but won't watch — surfaced so the UI can say why
      // (e.g. "this store asks bots not to read its policy pages").
      skipped: SkippedPage[];
    }
  | StoreProbeError;

const PRODUCTS_JSON_PROBE = "/products.json?limit=1";

export const notShopifyMessage = (host: string) =>
  `${host} isn't a Shopify store. Trailwatch tracks Shopify stores, where we can read every product, price and sale.`;

export const notStoreMessage = (host: string) =>
  `${host} doesn't look like an online store. Trailwatch tracks Shopify stores.`;

/** Validate a domain the user typed; null when it's fine to probe. */
export function storeInputError(input: string): StoreProbeError | null {
  const host = canonicalStoreHost(input);
  if (!host) {
    return {
      ok: false,
      code: "invalid",
      message: "Enter a website like dewlane.com.",
    };
  }
  if (isMarketplace(host)) return { ok: false, code: "marketplace", message: MARKETPLACE_MESSAGE };
  return null;
}

/**
 * Everything we learn about a store when it's first added: platform, a display
 * name, and which pages to watch. Network only — no database — so the add flow
 * and scripts/probe-stores.ts share it. Honors robots.txt for every path and
 * makes at most ~7 small requests.
 */
export async function probeStore(input: string): Promise<StoreProbe> {
  const inputError = storeInputError(input);
  if (inputError) return inputError;
  const host = canonicalStoreHost(input)!;

  const robots = await fetchRobotsTxt(`https://${host}`);
  const homeAllowed = robotsAllows(robots, "/");
  const fetchBoth = () =>
    Promise.all([
      homeAllowed ? safeFetch(`https://${host}/`) : null,
      robotsAllows(robots, PRODUCTS_JSON_PROBE)
        ? safeFetch(`https://${host}${PRODUCTS_JSON_PROBE}`, { maxBytes: 500_000 })
        : null,
    ]);
  let [home, productsJson] = await fetchBoth();
  // One retry: a network blip shouldn't tell the user the site is unreachable,
  // or cost the homepage we read the store's name and pages from.
  if (!home?.ok && !productsJson?.ok) {
    await new Promise((r) => setTimeout(r, 1_500));
    [home, productsJson] = await fetchBoth();
  } else if (homeAllowed && !home?.ok) {
    await new Promise((r) => setTimeout(r, 1_500));
    home = await safeFetch(`https://${host}/`);
  }

  if (!home?.ok && !productsJson?.ok) {
    return {
      ok: false,
      code: "unreachable",
      message: "We couldn't open that site. Check the address, or try their main domain.",
    };
  }

  // An address that forwards to a different site (a parked or sold domain, or
  // the brand's real domain) isn't this store: say where it goes.
  if (home?.ok) {
    const landed = new URL(home.finalUrl).hostname.toLowerCase();
    if (parse(landed).domain !== parse(host).domain) {
      const other = landed.replace(/^www\./, "");
      return {
        ok: false,
        code: "unreachable",
        message: `${host} sends visitors to ${other}. If that's their store, add ${other} instead.`,
      };
    }
  }

  // Build watched-page URLs on the origin the homepage settled on (usually the
  // www. host), so later checks don't pay for a redirect every time.
  const base = home?.ok ? new URL(home.finalUrl).origin : `https://${host}`;
  const platform = classifyPlatform({
    productsJson: productsJson?.ok ? productsJson.html : null,
    homepageHeaders: home?.ok ? home.headers : null,
    homepageHtml: home?.ok ? home.html : null,
  });

  // Shopify only (owner decision 2026-10-02): elsewhere we can't read the
  // catalog, so the store would be tracked with no products. Say whether it's
  // not a store at all (a SaaS site, a blog) or a store on another platform.
  if (platform.platform !== "shopify") {
    return home?.ok && !looksLikeStore(home.html)
      ? { ok: false, code: "not_store", message: notStoreMessage(host) }
      : { ok: false, code: "not_shopify", message: notShopifyMessage(host) };
  }

  const pages: WatchedPage[] = [];
  const skipped: SkippedPage[] = [];

  if (homeAllowed) pages.push({ kind: "homepage", url: `${base}/` });
  else skipped.push({ kind: "homepage", url: `${base}/`, reason: "robots" });

  // A page we'd watch has to open and show real content, not a "Page Not
  // Found" screen served with a 200.
  const exists = async (url: string) => {
    const res = await safeFetch(url);
    return res.ok && !isNotFoundPage(res.html);
  };

  // Sale page: prefer one the homepage links to; on Shopify, fall back to the
  // conventional sale collection if it exists.
  const linked = home?.ok ? findSalePagePath(home.html, base) : null;
  if (linked) {
    const url = `${base}${linked}`;
    if (!robotsAllows(robots, linked)) skipped.push({ kind: "sale", url, reason: "robots" });
    else if (await exists(url)) pages.push({ kind: "sale", url });
    else skipped.push({ kind: "sale", url, reason: "not-found" });
  } else if (platform.platform === "shopify") {
    for (const path of SHOPIFY_SALE_FALLBACK_PATHS) {
      if (!robotsAllows(robots, path)) continue;
      if (await exists(`${base}${path}`)) {
        pages.push({ kind: "sale", url: `${base}${path}` });
        break;
      }
    }
  }

  if (platform.platform === "shopify") {
    const policies = await Promise.all(
      SHOPIFY_POLICY_PATHS.map(async ({ kind, path }): Promise<WatchedPage | SkippedPage> => {
        const url = `${base}${path}`;
        if (!robotsAllows(robots, path)) return { kind, url, reason: "robots" };
        return (await exists(url)) ? { kind, url } : { kind, url, reason: "not-found" };
      }),
    );
    for (const p of policies) {
      if ("reason" in p) skipped.push(p);
      else pages.push(p);
    }
  }

  return {
    ok: true,
    host,
    name: storeNameFrom(home?.ok ? home.html : null, host),
    platform,
    pages,
    skipped,
  };
}
