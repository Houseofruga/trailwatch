import { describe, expect, it } from "vitest";
import { hashCatalog, normalizeShopifyProduct, toCents } from "./normalize";
import { product } from "./fixtures";

describe("toCents", () => {
  it("converts money strings and numbers to integer cents", () => {
    expect(toCents("25.00")).toBe(2500);
    expect(toCents("19.99")).toBe(1999);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it("treats missing, zero and garbage as no price", () => {
    for (const v of [null, undefined, "", "0.00", 0, "abc", -5]) expect(toCents(v)).toBeNull();
  });
});

describe("normalizeShopifyProduct", () => {
  const raw = {
    id: 7340901859408,
    handle: "womens-flip-flop",
    title: " Women's Flip Flop ",
    body_html: "<p>long description</p>",
    product_type: "Sandals",
    vendor: "Allbirds",
    tags: "summer, sale ,",
    created_at: "2026-05-01T00:00:00Z",
    published_at: "2026-05-02T00:00:00Z",
    images: [{ src: "https://cdn.shopify.com/a.jpg" }, { src: "https://cdn.shopify.com/b.jpg" }],
    variants: [
      { id: 111, title: "6", sku: "FF-6", price: "25.00", compare_at_price: "50.00", available: false },
      { id: 112, title: "7", sku: "", price: "25.00", compare_at_price: null, available: true },
      { id: 113, title: "broken", price: null, available: true },
    ],
  };

  it("keeps only our fields, with cents, string ids and split tags", () => {
    expect(normalizeShopifyProduct(raw)).toEqual({
      id: "7340901859408",
      handle: "womens-flip-flop",
      title: "Women's Flip Flop",
      productType: "Sandals",
      tags: ["summer", "sale"],
      vendor: "Allbirds",
      createdAt: "2026-05-01T00:00:00Z",
      publishedAt: "2026-05-02T00:00:00Z",
      image: "https://cdn.shopify.com/a.jpg",
      description: "long description",
      variants: [
        { id: "111", title: "6", sku: "FF-6", price: 2500, compareAtPrice: 5000, available: false },
        { id: "112", title: "7", sku: null, price: 2500, compareAtPrice: null, available: true },
      ],
    });
  });

  it("accepts tags as an array", () => {
    expect(normalizeShopifyProduct({ ...raw, tags: ["a", " b "] })?.tags).toEqual(["a", "b"]);
  });

  it("drops $0 helper products (bundle/upsell app items), keeps variant-less ones", () => {
    const helper = {
      ...raw,
      title: "Super Fluff Bundle Checkout",
      variants: [{ id: 1, title: "Default", price: "0.00", compare_at_price: null, available: true }],
    };
    expect(normalizeShopifyProduct(helper)).toBeNull();
    expect(normalizeShopifyProduct({ ...raw, variants: [] })).not.toBeNull();
  });

  it("returns null for malformed products", () => {
    expect(normalizeShopifyProduct({ id: 1 })).toBeNull();
    expect(normalizeShopifyProduct(null)).toBeNull();
    expect(normalizeShopifyProduct("nope")).toBeNull();
  });
});

describe("hashCatalog", () => {
  it("ignores product order but notices any change", () => {
    const a = [product("1"), product("2")];
    expect(hashCatalog(a)).toBe(hashCatalog([a[1], a[0]]));
    expect(hashCatalog(a)).not.toBe(hashCatalog([product("1"), product("2", { title: "Renamed" })]));
  });
});
