import { describe, expect, it } from "vitest";
import { classifyPlatform, looksLikeStore } from "./detectPlatform";

const none = { productsJson: null, homepageHeaders: null, homepageHtml: null };

describe("classifyPlatform", () => {
  it("is Shopify when /products.json returns a products array", () => {
    const result = classifyPlatform({ ...none, productsJson: '{"products":[{"id":1}]}' });
    expect(result).toEqual({ platform: "shopify", productsJsonAvailable: true, evidence: "products.json" });
  });

  it("accepts an empty products array (a store with nothing published yet)", () => {
    expect(classifyPlatform({ ...none, productsJson: '{"products":[]}' }).platform).toBe("shopify");
  });

  it("does not trust JSON without a products array, or non-JSON", () => {
    expect(classifyPlatform({ ...none, productsJson: '{"items":[]}' }).platform).toBe("generic");
    expect(classifyPlatform({ ...none, productsJson: '{"products":"nope"}' }).platform).toBe("generic");
    expect(classifyPlatform({ ...none, productsJson: "<html>404</html>" }).platform).toBe("generic");
  });

  it("falls back to Shopify response headers", () => {
    const result = classifyPlatform({ ...none, homepageHeaders: { "x-shopid": "123" } });
    expect(result).toEqual({ platform: "shopify", productsJsonAvailable: false, evidence: "headers" });
    expect(classifyPlatform({ ...none, homepageHeaders: { "powered-by": "Shopify" } }).evidence).toBe(
      "headers",
    );
  });

  it("falls back to Shopify CDN assets in the homepage", () => {
    const html = '<link rel="stylesheet" href="//cdn.shopify.com/s/files/theme.css">';
    const result = classifyPlatform({ ...none, homepageHtml: html });
    expect(result).toEqual({ platform: "shopify", productsJsonAvailable: false, evidence: "assets" });
    expect(classifyPlatform({ ...none, homepageHtml: '<img src="/cdn/shop/files/a.jpg">' }).evidence).toBe(
      "assets",
    );
  });

  it("is generic with no Shopify signal", () => {
    const result = classifyPlatform({
      productsJson: null,
      homepageHeaders: { server: "nginx" },
      homepageHtml: "<html><body>Hello</body></html>",
    });
    expect(result).toEqual({ platform: "generic", productsJsonAvailable: false, evidence: "none" });
  });
});

describe("looksLikeStore", () => {
  it("sees a store in an add-to-cart button, a cart link, or a store platform's assets", () => {
    expect(looksLikeStore('<button class="btn">Add to Bag</button>')).toBe(true);
    expect(looksLikeStore('<a href="/cart">Cart (0)</a>')).toBe(true);
    expect(looksLikeStore("<a href='https://shop.dewlane.com/en-us/bag?x=1'>Bag</a>")).toBe(true);
    expect(looksLikeStore('<link href="/wp-content/plugins/woocommerce/assets/css/x.css">')).toBe(true);
    expect(looksLikeStore('<script src="https://cdn11.bigcommerce.com/s-abc/x.js"></script>')).toBe(true);
    expect(looksLikeStore('<img src="https://demandware.static/x.jpg">')).toBe(true);
  });

  it("sees no store on a SaaS homepage", () => {
    const saas = `
      <a href="/pricing">Pricing</a><a href="/checkout/pro">Start trial</a>
      <a href="/product/ai">Product</a><a href="/bags-and-backpacks/c/1">x</a>
      <script type="application/ld+json">{"@type":"SoftwareApplication","offers":{"@type":"Offer","price":"10"}}</script>
      <p>Works with Shopify and Squarespace Commerce.</p>`;
    expect(looksLikeStore(saas)).toBe(false);
  });
});
