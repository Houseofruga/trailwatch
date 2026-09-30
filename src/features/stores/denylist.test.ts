import { describe, expect, it } from "vitest";
import { isMarketplace } from "./denylist.config";

describe("isMarketplace", () => {
  it("blocks every listed marketplace", () => {
    for (const host of [
      "amazon.com",
      "walmart.com",
      "target.com",
      "ebay.com",
      "etsy.com",
      "aliexpress.com",
      "temu.com",
    ]) {
      expect(isMarketplace(host), host).toBe(true);
    }
  });

  it("matches wildcard entries on any public suffix", () => {
    expect(isMarketplace("amazon.co.uk")).toBe(true);
    expect(isMarketplace("amazon.de")).toBe(true);
    expect(isMarketplace("ebay.co.uk")).toBe(true);
  });

  it("matches subdomains and full URLs", () => {
    expect(isMarketplace("smile.amazon.com")).toBe(true);
    expect(isMarketplace("https://www.etsy.com/shop/SomeMaker")).toBe(true);
    expect(isMarketplace("https://www.walmart.com/ip/123")).toBe(true);
  });

  it("does not block exact-match entries on other suffixes or lookalikes", () => {
    expect(isMarketplace("target.co.uk")).toBe(false);
    expect(isMarketplace("amazonbasics-fan.com")).toBe(false);
    expect(isMarketplace("notetsy.com")).toBe(false);
  });

  it("allows a brand's own store", () => {
    expect(isMarketplace("dewlane.com")).toBe(false);
    expect(isMarketplace("dewlane.myshopify.com")).toBe(false);
  });

  it("returns false for junk input", () => {
    expect(isMarketplace("")).toBe(false);
    expect(isMarketplace("not a domain")).toBe(false);
  });
});
