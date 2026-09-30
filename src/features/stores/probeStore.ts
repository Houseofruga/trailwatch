import { safeFetch } from "@/features/lastUpdated/fetch";
import { fetchRobotsTxt, robotsAllows } from "@/features/checks/fetchPage";
import { canonicalStoreHost, storeNameFrom } from "./domain";
import { isMarketplace, MARKETPLACE_MESSAGE } from "./denylist.config";
import { classifyPlatform, type PlatformResult } from "./detectPlatform";
import {
  findSalePagePath,
  SHOPIFY_POLICY_PATHS,
  SHOPIFY_SALE_FALLBACK_PATHS,
  type StorePageKind,
} from "./discoverPages";

export type WatchedPage = { kind: StorePageKind; url: string };
export type SkippedPage = WatchedPage & { reason: "robots" | "not-found" };

export type StoreProbeError = {
  ok: false;
  code: "invalid" | "marketplace" | "unreachable";
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
  const [home, productsJson] = await Promise.all([
    homeAllowed ? safeFetch(`https://${host}/`) : null,
    robotsAllows(robots, PRODUCTS_JSON_PROBE)
      ? safeFetch(`https://${host}${PRODUCTS_JSON_PROBE}`, { maxBytes: 500_000 })
      : null,
  ]);

  if (!home?.ok && !productsJson?.ok) {
    return {
      ok: false,
      code: "unreachable",
      message: "We couldn't open that site. Check the address, or try their main domain.",
    };
  }

  // Build watched-page URLs on the origin the homepage settled on (usually the
  // www. host), so later checks don't pay for a redirect every time.
  const base = home?.ok ? new URL(home.finalUrl).origin : `https://${host}`;
  const platform = classifyPlatform({
    productsJson: productsJson?.ok ? productsJson.html : null,
    homepageHeaders: home?.ok ? home.headers : null,
    homepageHtml: home?.ok ? home.html : null,
  });

  const pages: WatchedPage[] = [];
  const skipped: SkippedPage[] = [];

  if (homeAllowed) pages.push({ kind: "homepage", url: `${base}/` });
  else skipped.push({ kind: "homepage", url: `${base}/`, reason: "robots" });

  // Sale page: prefer one the homepage links to; on Shopify, fall back to the
  // conventional collections if they exist.
  const linked = home?.ok ? findSalePagePath(home.html, base) : null;
  if (linked) {
    if (robotsAllows(robots, linked)) pages.push({ kind: "sale", url: `${base}${linked}` });
    else skipped.push({ kind: "sale", url: `${base}${linked}`, reason: "robots" });
  } else if (platform.platform === "shopify") {
    for (const path of SHOPIFY_SALE_FALLBACK_PATHS) {
      if (!robotsAllows(robots, path)) continue;
      if ((await safeFetch(`${base}${path}`)).ok) {
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
        return (await safeFetch(url)).ok ? { kind, url } : { kind, url, reason: "not-found" };
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
