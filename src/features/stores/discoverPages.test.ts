import { describe, expect, it } from "vitest";
import { featuredProductHandles, findSalePagePath, isNotFoundPage } from "./discoverPages";

const ORIGIN = "https://www.dewlane.com";
const page = (...hrefs: string[]) => hrefs.map((h) => `<a href="${h}">x</a>`).join("");

describe("findSalePagePath", () => {
  it("finds a linked sale collection", () => {
    expect(findSalePagePath(page("/pages/about", "/collections/sale"), ORIGIN)).toBe("/collections/sale");
  });

  it("prefers a literal sale collection over sale-ish ones, and those over clearance", () => {
    const html = page("/collections/all", "/collections/outlet", "/collections/summer-sale", "/collections/sale");
    expect(findSalePagePath(html, ORIGIN)).toBe("/collections/sale");
    expect(findSalePagePath(page("/collections/all", "/collections/summer-sale"), ORIGIN)).toBe(
      "/collections/summer-sale",
    );
    expect(findSalePagePath(page("/collections/all", "/collections/clearance"), ORIGIN)).toBe(
      "/collections/clearance",
    );
  });

  it("doesn't take the 'all products' collection for a sale page", () => {
    expect(findSalePagePath(page("/collections/all"), ORIGIN)).toBeNull();
    expect(findSalePagePath(page("/en-in/collections/all"), ORIGIN)).toBeNull();
  });

  it("keeps the first link on a tie (nav comes before the footer)", () => {
    expect(findSalePagePath(page("/collections/summer-sale", "/collections/winter-sale"), ORIGIN)).toBe(
      "/collections/summer-sale",
    );
  });

  it("strips Shopify Markets locale prefixes and trailing slashes", () => {
    expect(findSalePagePath(page("/en-in/collections/sale"), ORIGIN)).toBe("/collections/sale");
    expect(findSalePagePath(page("/fr/collections/sale/"), ORIGIN)).toBe("/collections/sale");
  });

  it("accepts absolute same-host links, with or without www", () => {
    expect(findSalePagePath(page("https://dewlane.com/collections/sale?ref=nav"), ORIGIN)).toBe(
      "/collections/sale",
    );
  });

  it("ignores other hosts, product pages under a collection, and unrelated collections", () => {
    const html = page(
      "https://other.com/collections/sale",
      "/collections/sale/products/cream",
      "/collections/moisturizers",
      "/products/sale-cream",
    );
    expect(findSalePagePath(html, ORIGIN)).toBeNull();
  });

  it("finds top-level sale pages on non-Shopify stores, but not a top-level /all", () => {
    expect(findSalePagePath(page("/sale"), ORIGIN)).toBe("/sale");
    expect(findSalePagePath(page("/shop/clearance"), ORIGIN)).toBe("/shop/clearance");
    expect(findSalePagePath(page("/all"), ORIGIN)).toBeNull();
  });

  it("survives malformed hrefs", () => {
    expect(findSalePagePath(page("http://[bad", "/collections/%E0%A4%A", "/collections/sale"), ORIGIN)).toBe(
      "/collections/sale",
    );
  });
});

describe("featuredProductHandles", () => {
  it("collects same-host product links in page order, deduped and lowercased", () => {
    const html = page(
      "/products/Night-Cream",
      "/collections/best/products/day-serum",
      "/en-us/products/night-cream",
      "https://dewlane.com/products/toner?variant=1",
      "https://other.com/products/stolen",
      "/collections/sale",
    );
    expect(featuredProductHandles(html, ORIGIN)).toEqual(["night-cream", "day-serum", "toner"]);
  });

  it("returns nothing for a page without product links", () => {
    expect(featuredProductHandles(page("/pages/about", "/collections/all"), ORIGIN)).toEqual([]);
  });
});

describe("isNotFoundPage", () => {
  const html = (title: string) => `<html><head><title>${title}</title></head><body>Shop our sale</body></html>`;

  it("spots a not-found screen served as OK", () => {
    expect(isNotFoundPage(html("Page Not Found - Northwind Knits"))).toBe(true);
    expect(isNotFoundPage(html("404 Not Found"))).toBe(true);
    expect(isNotFoundPage(html("\n  404 – Dewlane\n"))).toBe(true);
  });

  it("leaves real pages alone, whatever the body says", () => {
    expect(isNotFoundPage(html("Sale – Dewlane"))).toBe(false);
    expect(isNotFoundPage(html("Products – Dewlane").replace("Shop our sale", "Item not found in cart"))).toBe(false);
    expect(isNotFoundPage("<html><body>no title here</body></html>")).toBe(false);
  });
});
