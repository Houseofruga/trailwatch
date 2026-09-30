import { describe, expect, it, vi } from "vitest";
import type { PageResponse } from "./fetchCatalog";
import { fetchSitemapCatalog, parseSitemap, productFromJsonLd, productHandleOf } from "./sitemapFallback";

const BASE = "https://ruggable.example";

const urlset = (entries: [string, string][]) =>
  `<?xml version="1.0"?><urlset>${entries
    .map(([loc, lastmod]) => `<url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join("")}</urlset>`;

const productPage = (name: string, offers: unknown) =>
  `<html><script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    image: ["https://cdn.example/a.jpg"],
    brand: { "@type": "Brand", name: "Ruggable" },
    offers,
  })}</script></html>`;

describe("parseSitemap / productHandleOf", () => {
  it("splits an index into child sitemaps and a urlset into entries", () => {
    const index = `<sitemapindex><sitemap><loc>${BASE}/sitemap_products_1.xml?from=1&amp;to=9</loc></sitemap></sitemapindex>`;
    expect(parseSitemap(index).sitemaps).toEqual([`${BASE}/sitemap_products_1.xml?from=1&to=9`]);
    expect(parseSitemap(urlset([[`${BASE}/products/a`, "2026-09-01"]])).urls).toEqual([
      { loc: `${BASE}/products/a`, lastmod: "2026-09-01" },
    ]);
  });

  it("recognizes product URLs only (locale prefix allowed)", () => {
    expect(productHandleOf(`${BASE}/products/cozy-rug`)).toBe("cozy-rug");
    expect(productHandleOf(`${BASE}/en-us/products/cozy-rug/`)).toBe("cozy-rug");
    expect(productHandleOf(`${BASE}/collections/rugs`)).toBeNull();
    expect(productHandleOf(`${BASE}/products/a/b`)).toBeNull();
  });
});

describe("productFromJsonLd", () => {
  it("reads name, brand, image and offers (variant ids from ?variant=)", () => {
    const html = productPage("Cozy Rug", [
      { "@type": "Offer", price: "199.00", availability: "https://schema.org/InStock", url: "/products/cozy?variant=11", sku: "CR-5" },
      { "@type": "Offer", price: "299.00", availability: "https://schema.org/OutOfStock", url: "/products/cozy?variant=12" },
    ]);
    expect(productFromJsonLd(html, "cozy")).toMatchObject({
      id: "cozy",
      title: "Cozy Rug",
      vendor: "Ruggable",
      image: "https://cdn.example/a.jpg",
      variants: [
        { id: "11", sku: "CR-5", price: 19900, compareAtPrice: null, available: true },
        { id: "12", price: 29900, available: false },
      ],
    });
  });

  it("handles a single offer object, AggregateOffer and @graph", () => {
    const single = productPage("One", { "@type": "Offer", price: 10, availability: "InStock" });
    expect(productFromJsonLd(single, "one")?.variants).toHaveLength(1);

    const aggregate = productPage("Agg", {
      "@type": "AggregateOffer",
      offers: [{ "@type": "Offer", price: "5.00", sku: "A" }, { "@type": "Offer", price: "6.00", sku: "B" }],
    });
    expect(productFromJsonLd(aggregate, "agg")?.variants.map((v) => v.id)).toEqual(["A", "B"]);

    const graph = `<script type="application/ld+json">${JSON.stringify({
      "@graph": [{ "@type": "WebPage" }, { "@type": "Product", name: "G", offers: { price: "1.00" } }],
    })}</script>`;
    expect(productFromJsonLd(graph, "g")?.title).toBe("G");
  });

  it("reads a ProductGroup's hasVariant products (ruggable.com markup)", () => {
    const html = `<script type="application/ld+json">${JSON.stringify([
      {
        "@type": "ProductGroup",
        name: "Standard Rug Pad | Ruggable",
        brand: { "@type": "Brand", name: "Ruggable" },
        productGroupID: "PAD-GROUP",
        hasVariant: [
          {
            "@type": "Product",
            sku: "PAD-2x3",
            name: "Standard Rug Pad | 2'x3'",
            offers: [{ "@type": "Offer", price: "39.00", availability: "http://schema.org/InStock", url: "/products/pad?variant=393" }],
          },
          {
            "@type": "Product",
            sku: "PAD-5x7",
            name: "Standard Rug Pad | 5'x7'",
            offers: { "@type": "Offer", price: "79.00", availability: "http://schema.org/OutOfStock" },
          },
        ],
      },
    ])}</script>`;
    expect(productFromJsonLd(html, "pad")).toMatchObject({
      title: "Standard Rug Pad | Ruggable",
      vendor: "Ruggable",
      variants: [
        { id: "393", sku: "PAD-2x3", title: "Standard Rug Pad | 2'x3'", price: 3900, available: true },
        { id: "PAD-5x7", sku: "PAD-5x7", price: 7900, available: false },
      ],
    });
  });

  it("returns null without a Product node, and survives broken JSON-LD", () => {
    expect(productFromJsonLd('<script type="application/ld+json">{broken</script>', "x")).toBeNull();
    expect(productFromJsonLd("<html></html>", "x")).toBeNull();
  });
});

describe("fetchSitemapCatalog", () => {
  const noSleep = vi.fn(async () => {});

  it("lists every product from the sitemap and details the newest ones", async () => {
    const pages: Record<string, PageResponse> = {
      [`${BASE}/sitemap.xml`]: {
        ok: true,
        body: `<sitemapindex><sitemap><loc>${BASE}/sitemap_pages_1.xml</loc></sitemap><sitemap><loc>${BASE}/sitemap_products_1.xml</loc></sitemap></sitemapindex>`,
      },
      [`${BASE}/sitemap_products_1.xml`]: {
        ok: true,
        body: urlset([
          [`${BASE}/products/old-rug`, "2025-01-01"],
          [`${BASE}/products/new-rug`, "2026-09-01"],
          [`${BASE}/collections/all`, "2026-09-01"],
        ]),
      },
      [`${BASE}/products/new-rug`]: { ok: true, body: productPage("New Rug", { price: "99.00", availability: "InStock" }) },
    };
    const fetchPage = vi.fn(async (url: string) => pages[url] ?? { ok: false as const, status: 404, message: "404" });

    const result = await fetchSitemapCatalog(BASE, null, { fetchPage, sleep: noSleep, config: { sitemapDetailCap: 1 } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.catalog).toMatchObject({ source: "sitemap", complete: true });
    const byId = Object.fromEntries(result.catalog.products.map((p) => [p.id, p]));
    expect(Object.keys(byId).sort()).toEqual(["new-rug", "old-rug"]);
    expect(byId["new-rug"]).toMatchObject({ title: "New Rug", variants: [{ price: 9900 }] });
    expect(byId["old-rug"]).toMatchObject({ title: "Old rug", variants: [] });
    // Only the product sitemap is read, not the pages sitemap.
    expect(fetchPage).not.toHaveBeenCalledWith(`${BASE}/sitemap_pages_1.xml`);
  });

  it("fails when a product sitemap can't be read (would look like mass removals)", async () => {
    const fetchPage = vi.fn(async (url: string): Promise<PageResponse> =>
      url.endsWith("/sitemap.xml")
        ? { ok: true, body: `<sitemapindex><sitemap><loc>${BASE}/sitemap_products_1.xml</loc></sitemap></sitemapindex>` }
        : { ok: false, status: 503, message: "HTTP 503" },
    );
    expect(await fetchSitemapCatalog(BASE, null, { fetchPage, sleep: noSleep })).toMatchObject({ ok: false });
  });

  it("respects robots.txt for the sitemap", async () => {
    const fetchPage = vi.fn();
    const result = await fetchSitemapCatalog(BASE, "User-agent: *\nDisallow: /sitemap", { fetchPage, sleep: noSleep });
    expect(result).toMatchObject({ ok: false });
    expect(fetchPage).not.toHaveBeenCalled();
  });
});
