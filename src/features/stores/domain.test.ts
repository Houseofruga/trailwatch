import { describe, expect, it } from "vitest";
import { canonicalStoreHost, storeNameFrom } from "./domain";

describe("canonicalStoreHost", () => {
  it("accepts bare domains and full URLs, dropping www., path and case", () => {
    expect(canonicalStoreHost("dewlane.com")).toBe("dewlane.com");
    expect(canonicalStoreHost("  WWW.Dewlane.com ")).toBe("dewlane.com");
    expect(canonicalStoreHost("https://www.dewlane.com/collections/sale?x=1")).toBe("dewlane.com");
    expect(canonicalStoreHost("http://dewlane.co.uk")).toBe("dewlane.co.uk");
  });

  it("keeps non-www subdomains (a store can live on one)", () => {
    expect(canonicalStoreHost("shop.northwind.com")).toBe("shop.northwind.com");
    expect(canonicalStoreHost("dewlane.myshopify.com")).toBe("dewlane.myshopify.com");
  });

  it("rejects input that isn't a public hostname", () => {
    expect(canonicalStoreHost("")).toBeNull();
    expect(canonicalStoreHost("not a domain")).toBeNull();
    expect(canonicalStoreHost("localhost")).toBeNull();
    expect(canonicalStoreHost("127.0.0.1")).toBeNull();
    expect(canonicalStoreHost("dewlane")).toBeNull();
  });
});

describe("storeNameFrom", () => {
  it("prefers og:site_name", () => {
    const html = '<meta property="og:site_name" content="Peak Tonic">';
    expect(storeNameFrom(html, "peaktonic.com")).toBe("Peak Tonic");
  });

  it("falls back to the capitalized brand part of the domain", () => {
    expect(storeNameFrom(null, "dewlane.com")).toBe("Dewlane");
    expect(storeNameFrom("<title>x</title>", "shop.northwind.co.uk")).toBe("Northwind");
  });

  it("takes the brand segment of the title when it matches the domain", () => {
    const title = "<title>Luxury Organic Bedding, Sheets &amp; Towels | Boll &amp; Branch</title>";
    expect(storeNameFrom(title, "bollandbranch.com")).toBe("Boll & Branch");
    expect(storeNameFrom("<title>Parachute – Home happens here.</title>", "parachutehome.com")).toBe("Parachute");
    // A tagline that doesn't match the domain isn't a name.
    expect(storeNameFrom("<title>Home | Shop the best sheets</title>", "dewlane.com")).toBe("Dewlane");
  });

  it("ignores an og:site_name that's too long to be a name", () => {
    const html = `<meta property="og:site_name" content="${"Very long tagline ".repeat(4)}">`;
    expect(storeNameFrom(html, "dewlane.com")).toBe("Dewlane");
  });
});
