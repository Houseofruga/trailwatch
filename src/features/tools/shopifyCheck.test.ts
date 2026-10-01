import { describe, expect, it } from "vitest";
import { explain, otherPlatform } from "./shopifyCheck";

const base = { host: "dewlane.com", name: "Dewlane", productsJson: null, homepageHeaders: null, homepageHtml: null };

describe("Shopify checker", () => {
  it("lists every Shopify sign it saw, catalog first, and whether the catalog is public", () => {
    const r = explain({
      ...base,
      productsJson: '{"products":[]}',
      homepageHeaders: { "x-shopid": "1" },
      homepageHtml: '<img src="https://cdn.shopify.com/a.png">',
    });
    expect(r).toMatchObject({ verdict: "shopify", platformName: "Shopify", catalogPublic: true });
    expect(r.evidence).toHaveLength(3);
    expect(r.evidence[0]).toMatch(/products\.json/);
  });

  it("says Shopify with a hidden catalog from its CDN files alone", () => {
    const r = explain({ ...base, homepageHeaders: {}, homepageHtml: '<link href="/cdn/shop/t/1/a.css">' });
    expect(r).toMatchObject({ verdict: "shopify", catalogPublic: false });
    expect(r.evidence).toEqual(["Its pages load files from Shopify’s CDN."]);
  });

  it("names another store platform when it sees one", () => {
    const html = '<link href="/wp-content/plugins/woocommerce/a.css">';
    expect(explain({ ...base, homepageHeaders: {}, homepageHtml: html })).toMatchObject({
      verdict: "other-store",
      platformName: "WooCommerce",
    });
  });

  it("tells a store on an unknown platform from a site that isn't a store", () => {
    expect(explain({ ...base, homepageHeaders: {}, homepageHtml: '<a href="/cart">Cart</a>' })).toMatchObject({
      verdict: "other-store",
      platformName: null,
    });
    expect(explain({ ...base, homepageHeaders: {}, homepageHtml: "<a href='/pricing'>Pricing</a>" }).verdict).toBe("not-a-store");
  });

  it("can't tell when the homepage couldn't be read", () => {
    expect(explain(base)).toMatchObject({ verdict: "unknown", evidence: ["The site doesn’t let us read its homepage."] });
  });

  it("recognises platforms by their asset paths, not by mentions", () => {
    expect(otherPlatform('<script src="https://cdn11.bigcommerce.com/s-x/a.js">')).toBe("BigCommerce");
    expect(otherPlatform("<p>We integrate with BigCommerce and Squarespace.</p>")).toBeNull();
  });
});
