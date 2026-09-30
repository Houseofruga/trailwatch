import { describe, expect, it } from "vitest";
import { findSalePagePath } from "./discoverPages";

const ORIGIN = "https://www.dewlane.com";
const page = (...hrefs: string[]) => hrefs.map((h) => `<a href="${h}">x</a>`).join("");

describe("findSalePagePath", () => {
  it("finds a linked sale collection", () => {
    expect(findSalePagePath(page("/pages/about", "/collections/sale"), ORIGIN)).toBe("/collections/sale");
  });

  it("prefers a literal sale collection over sale-ish ones, and those over clearance and 'all'", () => {
    const html = page("/collections/all", "/collections/outlet", "/collections/summer-sale", "/collections/sale");
    expect(findSalePagePath(html, ORIGIN)).toBe("/collections/sale");
    expect(findSalePagePath(page("/collections/all", "/collections/summer-sale"), ORIGIN)).toBe(
      "/collections/summer-sale",
    );
    expect(findSalePagePath(page("/collections/all", "/collections/clearance"), ORIGIN)).toBe(
      "/collections/clearance",
    );
    expect(findSalePagePath(page("/collections/all"), ORIGIN)).toBe("/collections/all");
  });

  it("keeps the first link on a tie (nav comes before the footer)", () => {
    expect(findSalePagePath(page("/collections/summer-sale", "/collections/winter-sale"), ORIGIN)).toBe(
      "/collections/summer-sale",
    );
  });

  it("strips Shopify Markets locale prefixes and trailing slashes", () => {
    expect(findSalePagePath(page("/en-in/collections/all"), ORIGIN)).toBe("/collections/all");
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
