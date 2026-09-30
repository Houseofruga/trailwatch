import * as cheerio from "cheerio";
import { robotsAllows } from "@/features/checks/fetchPage";
import { CATALOG_CONFIG } from "./config";
import type { FetchCatalogResult, PageFetcher } from "./fetchCatalog";
import { toCents } from "./normalize";
import type { CatalogProduct, CatalogVariant } from "./types";

const MAX_CHILD_SITEMAPS = 20;
// /products/<handle>, optionally locale-prefixed; product pages only.
const PRODUCT_PATH = /^(?:\/[a-z]{2}(?:-[a-z]{2})?)?\/products\/([^/?#]+)\/?$/i;

export type SitemapEntry = { loc: string; lastmod: string | null };

/** Split a sitemap (or sitemap index) into child sitemaps and page URLs. */
export function parseSitemap(xml: string): { sitemaps: string[]; urls: SitemapEntry[] } {
  const $ = cheerio.load(xml, { xmlMode: true });
  const sitemaps = $("sitemap > loc")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);
  const urls = $("url")
    .map((_, el) => ({
      loc: $(el).children("loc").first().text().trim(),
      lastmod: $(el).children("lastmod").first().text().trim() || null,
    }))
    .get()
    .filter((u) => u.loc);
  return { sitemaps, urls };
}

/** The product handle of a product-page URL, or null for any other URL. */
export function productHandleOf(loc: string): string | null {
  try {
    const match = PRODUCT_PATH.exec(new URL(loc).pathname);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

type JsonLdNode = Record<string, unknown>;

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function isType(node: JsonLdNode, type: string): boolean {
  return asArray(node["@type"] as string | string[]).includes(type);
}

// Every JSON-LD node on the page, flattening arrays and @graph containers.
function jsonLdNodes(html: string): JsonLdNode[] {
  const $ = cheerio.load(html);
  const nodes: JsonLdNode[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      for (const node of asArray(JSON.parse($(el).text()) as JsonLdNode | JsonLdNode[])) {
        nodes.push(node, ...asArray(node["@graph"] as JsonLdNode[]));
      }
    } catch {
      // A broken JSON-LD block on some themes — skip it.
    }
  });
  return nodes;
}

/**
 * Build a catalog product from a product page's JSON-LD `Product` + `Offer`s.
 * Variant ids come from the offer's `?variant=` URL when present (Shopify),
 * else its SKU, else its position. JSON-LD carries no compare-at price, so
 * sale events aren't available in fallback mode — launches, removals, price
 * and stock are.
 */
export function productFromJsonLd(html: string, handle: string): CatalogProduct | null {
  const nodes = jsonLdNodes(html);
  // Newer themes describe variants as a ProductGroup whose `hasVariant`
  // Products each carry their own offer (ruggable.com, 2026-09-30); older ones
  // use one Product with a list of offers. Prefer the group when present.
  const group = nodes.find((n) => isType(n, "ProductGroup"));
  const product = group ?? nodes.find((n) => isType(n, "Product"));
  if (!product) return null;

  const offersOf = (node: JsonLdNode) =>
    asArray(node.offers as JsonLdNode | JsonLdNode[]).flatMap((o) =>
      isType(o, "AggregateOffer") ? asArray(o.offers as JsonLdNode[]) : [o],
    );
  const offers = group
    ? asArray(group.hasVariant as JsonLdNode[]).flatMap((variant) =>
        // A variant's SKU/name live on the variant Product, not its Offer.
        offersOf(variant).map((o) => ({ sku: variant.sku, name: variant.name, ...o })),
      )
    : offersOf(product);

  const variants: CatalogVariant[] = [];
  offers.forEach((offer, index) => {
    const price = toCents(offer.price);
    if (price === null) return;
    const url = typeof offer.url === "string" ? offer.url : "";
    const variantId = /[?&]variant=(\d+)/.exec(url)?.[1];
    const sku = typeof offer.sku === "string" && offer.sku.trim() ? offer.sku.trim() : null;
    variants.push({
      id: variantId ?? sku ?? String(index),
      title: typeof offer.name === "string" ? offer.name : "",
      sku,
      price,
      compareAtPrice: null,
      available: /InStock|LimitedAvailability|PreOrder/i.test(String(offer.availability ?? "")),
    });
  });

  const image = asArray(product.image as string | string[] | JsonLdNode)[0];
  return {
    id: handle,
    handle,
    title: typeof product.name === "string" ? product.name.trim() : handle,
    productType: typeof product.category === "string" ? product.category : "",
    tags: [],
    vendor:
      typeof product.brand === "object" && product.brand && typeof (product.brand as JsonLdNode).name === "string"
        ? ((product.brand as JsonLdNode).name as string)
        : "",
    createdAt: null,
    publishedAt: null,
    image: typeof image === "string" ? image : typeof image?.url === "string" ? image.url : null,
    variants,
  };
}

// "cozy-wool-rug" → "Cozy wool rug": a readable title for products we list from
// the sitemap but don't open this check.
function titleFromHandle(handle: string): string {
  const words = handle.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

type Options = {
  fetchPage: PageFetcher;
  sleep: (ms: number) => Promise<void>;
  config?: Partial<typeof CATALOG_CONFIG>;
};

/**
 * Fallback catalog for a store whose /products.json is unavailable: every
 * product URL from the sitemap (for launches/removals) plus JSON-LD price and
 * stock for the `sitemapDetailCap` most recently modified products.
 */
export async function fetchSitemapCatalog(
  base: string,
  robotsTxt: string | null,
  { fetchPage, sleep, config }: Options,
): Promise<FetchCatalogResult> {
  const cfg = { ...CATALOG_CONFIG, ...config };
  let requests = 0;
  const get = async (url: string) => {
    if (requests++ > 0) await sleep(cfg.pageDelayMs);
    return fetchPage(url);
  };

  if (!robotsAllows(robotsTxt, "/sitemap.xml")) {
    return { ok: false, message: "robots.txt disallows the sitemap.", pages: 0 };
  }
  const root = await get(`${base}/sitemap.xml`);
  if (!root.ok) return { ok: false, message: `Sitemap: ${root.message}`, pages: requests };

  const { sitemaps, urls: rootUrls } = parseSitemap(root.body);
  let urls = rootUrls;
  let complete = true;
  if (sitemaps.length > 0) {
    // Shopify names its product sitemaps sitemap_products_N.xml; other
    // platforms vary, so fall back to every child sitemap.
    const productMaps = sitemaps.filter((s) => /product/i.test(s));
    const children = (productMaps.length > 0 ? productMaps : sitemaps).slice(0, MAX_CHILD_SITEMAPS);
    if (children.length < (productMaps.length || sitemaps.length)) complete = false;
    urls = [];
    for (const child of children) {
      const res = await get(child);
      // A missing child sitemap would make its products look removed.
      if (!res.ok) return { ok: false, message: `Sitemap ${child}: ${res.message}`, pages: requests };
      urls.push(...parseSitemap(res.body).urls);
    }
  }

  const entries = new Map<string, SitemapEntry>();
  for (const u of urls) {
    const handle = productHandleOf(u.loc);
    if (handle && !entries.has(handle)) entries.set(handle, u);
  }
  if (entries.size === 0) return { ok: false, message: "No product URLs in the sitemap.", pages: requests };

  const newestFirst = [...entries.entries()].sort(([, a], [, b]) =>
    (b.lastmod ?? "").localeCompare(a.lastmod ?? ""),
  );
  const detailed = new Map<string, CatalogProduct>();
  for (const [handle, entry] of newestFirst.slice(0, cfg.sitemapDetailCap)) {
    if (!robotsAllows(robotsTxt, new URL(entry.loc).pathname)) continue;
    const res = await get(entry.loc);
    const product = res.ok ? productFromJsonLd(res.body, handle) : null;
    if (product) detailed.set(handle, product);
  }

  const products: CatalogProduct[] = [...entries.keys()].map(
    (handle) =>
      detailed.get(handle) ?? {
        id: handle,
        handle,
        title: titleFromHandle(handle),
        productType: "",
        tags: [],
        vendor: "",
        createdAt: null,
        publishedAt: null,
        image: null,
        variants: [],
      },
  );
  return { ok: true, catalog: { source: "sitemap", complete, products }, pages: requests };
}
