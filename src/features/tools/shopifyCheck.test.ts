import { describe, expect, it } from "vitest";
import { classifyPlatform } from "@/features/stores/detectPlatform";
import { explain, otherPlatform } from "./shopifyCheck";

const base = { host: "dewlane.com", name: "Dewlane" };

describe("Shopify checker", () => {
  it("says Shopify, with the strongest reason and whether the catalog is public", () => {
    const platform = classifyPlatform({ productsJson: '{"products":[]}', homepageHeaders: null, homepageHtml: null });
    const r = explain({ ...base, platform, homepageHtml: "<html></html>" });
    expect(r).toMatchObject({ verdict: "shopify", platformName: "Shopify", catalogPublic: true });
    expect(r.evidence[0]).toMatch(/products\.json/);
  });

  it("names another store platform when it sees one", () => {
    const html = '<link href="/wp-content/plugins/woocommerce/a.css">';
    const platform = classifyPlatform({ productsJson: null, homepageHeaders: {}, homepageHtml: html });
    expect(explain({ ...base, platform, homepageHtml: html })).toMatchObject({
      verdict: "other-store",
      platformName: "WooCommerce",
    });
  });

  it("calls a cart-less, platform-less site 'not a store', and an unreadable one 'unknown'", () => {
    const platform = classifyPlatform({ productsJson: null, homepageHeaders: {}, homepageHtml: "<a href='/pricing'>Pricing</a>" });
    expect(explain({ ...base, platform, homepageHtml: "<a href='/pricing'>Pricing</a>" }).verdict).toBe("not-a-store");
    expect(explain({ ...base, platform, homepageHtml: null }).verdict).toBe("unknown");
  });

  it("recognises platforms by their asset paths, not by mentions", () => {
    expect(otherPlatform('<script src="https://cdn11.bigcommerce.com/s-x/a.js">')).toBe("BigCommerce");
    expect(otherPlatform("<p>We integrate with BigCommerce and Squarespace.</p>")).toBeNull();
  });
});
