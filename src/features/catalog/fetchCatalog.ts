import { safeFetch } from "@/features/lastUpdated/fetch";
import { CATALOG_CONFIG } from "./config";
import { applyPriceTrackCap, normalizeShopifyProduct } from "./normalize";
import type { Catalog, CatalogProduct } from "./types";

// A minimal fetch contract so pagination/backoff is testable without the network.
export type PageResponse = { ok: true; body: string } | { ok: false; status?: number; message: string };
export type PageFetcher = (url: string) => Promise<PageResponse>;

export type FetchCatalogResult =
  | { ok: true; catalog: Catalog; pages: number }
  | { ok: false; message: string; pages: number };

type Options = {
  fetchPage?: PageFetcher;
  sleep?: (ms: number) => Promise<void>;
  config?: Partial<typeof CATALOG_CONFIG>;
};

/** The real network fetcher: SSRF-safe, with a size cap sized for catalog pages. */
export const catalogPageFetcher: PageFetcher = async (url) => {
  const res = await safeFetch(url, { maxBytes: CATALOG_CONFIG.pageMaxBytes, timeoutMs: 30_000 });
  return res.ok ? { ok: true, body: res.html } : { ok: false, status: res.status, message: res.message };
};

export const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Worth retrying: rate limited, or the store's side is having a moment.
function isRetryable(res: PageResponse): boolean {
  return !res.ok && (res.status === undefined || res.status === 429 || res.status >= 500);
}

/**
 * Read a Shopify store's full catalog from /products.json, page by page, until
 * an empty page. Polite by construction: a pause between pages and exponential
 * backoff on 429/5xx. Any page that still fails (or isn't valid JSON — e.g. cut
 * off by the size cap) fails the whole fetch, since a partial catalog would
 * look like mass removals. Hitting the page ceiling is different: that's a
 * deliberate stop, returned as `complete: false`.
 *
 * `base` is the store origin (https://www.brand.com). The caller checks robots.
 */
export async function fetchShopifyCatalog(base: string, options: Options = {}): Promise<FetchCatalogResult> {
  const fetchPage = options.fetchPage ?? catalogPageFetcher;
  const sleep = options.sleep ?? realSleep;
  const cfg = { ...CATALOG_CONFIG, ...options.config };

  const products: CatalogProduct[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= cfg.maxPages; page++) {
    if (page > 1) await sleep(cfg.pageDelayMs);
    const url = `${base}/products.json?limit=${cfg.pageSize}&page=${page}&${cfg.usMarketQuery}`;

    let res = await fetchPage(url);
    for (let attempt = 1; isRetryable(res) && attempt <= cfg.maxRetries; attempt++) {
      await sleep(cfg.retryBaseMs * 2 ** (attempt - 1));
      res = await fetchPage(url);
    }
    if (!res.ok) return { ok: false, message: `Catalog page ${page}: ${res.message}`, pages: page };

    let raw: unknown;
    try {
      raw = (JSON.parse(res.body) as { products?: unknown }).products;
    } catch {
      return { ok: false, message: `Catalog page ${page} wasn't valid JSON.`, pages: page };
    }
    if (!Array.isArray(raw)) {
      return { ok: false, message: `Catalog page ${page} had no products list.`, pages: page };
    }
    if (raw.length === 0) {
      return {
        ok: true,
        catalog: { source: "products.json", complete: true, products: applyPriceTrackCap(products, cfg.priceTrackCap) },
        pages: page,
      };
    }

    for (const item of raw) {
      const product = normalizeShopifyProduct(item);
      // Paging can repeat items when the catalog shifts mid-crawl; keep the first.
      if (product && !seen.has(product.id)) {
        seen.add(product.id);
        products.push(product);
      }
    }
  }

  return {
    ok: true,
    catalog: { source: "products.json", complete: false, products: applyPriceTrackCap(products, cfg.priceTrackCap) },
    pages: cfg.maxPages,
  };
}
