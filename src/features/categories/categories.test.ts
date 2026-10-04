import { describe, expect, it } from "vitest";
import { menuCollections } from "@/features/stores/discoverPages";
import { categoriesDue } from "./crawl";
import { categoryTitle, cleanLabel, countPage, parseCollectionsList, pickMenu, sharedPrefix, sortCategories, titleFromHandle } from "./summarize";

const ORIGIN = "https://www.dewlane.com";
const link = (href: string, text = "") => `<a href="${href}">${text}</a>`;

describe("menuCollections", () => {
  it("lists the collections the homepage links to, in page order, once each", () => {
    const html = [
      link("/collections/bedding", "Bedding"),
      link("/collections/bath", " Bath\n "),
      link("/collections/bedding", "Shop bedding"),
      link("/products/linen-duvet", "Linen duvet"),
      link("/pages/about", "About"),
    ].join("");
    expect(menuCollections(html, ORIGIN)).toEqual([
      { handle: "bedding", label: "Bedding" },
      { handle: "bath", label: "Bath" },
    ]);
  });

  it("leaves out sale pages, excluded handles, other sites and product links inside a collection", () => {
    const html = [
      link("/collections/sale", "Sale"),
      link("/collections/summer-sale", "Summer sale"),
      link("/collections/all", "Shop all"),
      link("https://hearthandpine.com/collections/candles", "Candles"),
      link("/collections/bedding/products/linen-duvet", "Linen duvet"),
      link("/collections/throws", "Throws"),
    ].join("");
    expect(menuCollections(html, ORIGIN, ["all"]).map((c) => c.handle)).toEqual(["throws"]);
  });

  it("strips locale prefixes and takes a later link's text when the first had none", () => {
    const html = [link("/en-in/collections/Pillows/", ""), link("/collections/pillows", "Pillows")].join("");
    expect(menuCollections(html, ORIGIN)).toEqual([{ handle: "pillows", label: "Pillows" }]);
  });

  it("drops text too long to be a menu label", () => {
    const html = link("/collections/kids", "x".repeat(80));
    expect(menuCollections(html, ORIGIN)).toEqual([{ handle: "kids", label: "" }]);
  });
});

describe("countPage", () => {
  const product = (price: string, was: string | null) => ({ variants: [{ price, compare_at_price: was }] });

  it("counts products and the ones with a variant below its compare-at price", () => {
    const text = JSON.stringify({ products: [product("40.00", "50.00"), product("40.00", null), product("40.00", "40.00"), product("40.00", "")] });
    expect(countPage(text)).toEqual({ products: 4, onSale: 1 });
  });

  it("is null for anything that isn't a products list", () => {
    expect(countPage("<html>Page not found</html>")).toBeNull();
    expect(countPage(JSON.stringify({ collections: [] }))).toBeNull();
  });
});

describe("parseCollectionsList", () => {
  it("reads handles, titles and product counts, skipping junk", () => {
    const text = JSON.stringify({
      collections: [{ handle: "Bedding", title: " Bedding ", products_count: 124 }, { title: "No handle" }, { handle: "bath" }],
    });
    expect(parseCollectionsList(text)).toEqual([
      { handle: "bedding", title: "Bedding", products: 124 },
      { handle: "bath", title: "", products: null },
    ]);
    expect(parseCollectionsList("not json")).toEqual([]);
  });
});

describe("sortCategories and titles", () => {
  it("puts the largest first and keeps menu order on a tie", () => {
    const c = (handle: string, products: number) => ({ handle, title: handle, products, onSale: 0 });
    expect(sortCategories([c("men", 48), c("bedding", 124), c("women", 48)]).map((x) => x.handle)).toEqual(["bedding", "men", "women"]);
  });

  it("makes a readable name from a handle", () => {
    expect(titleFromHandle("throws-and-blankets")).toBe("Throws and blankets");
  });
});

describe("categoriesDue", () => {
  const now = Date.parse("2026-10-04T12:00:00Z");
  it("is due when never read, or a day has passed", () => {
    expect(categoriesDue(null, now)).toBe(true);
    expect(categoriesDue("2026-10-03T11:00:00Z", now)).toBe(true);
    expect(categoriesDue("2026-10-04T06:00:00Z", now)).toBe(false);
  });
});

describe("pickMenu", () => {
  const menu = [
    { handle: "new", label: "New" },
    { handle: "bedding", label: "Bedding" },
    { handle: "empty", label: "Layers" },
    { handle: "bath", label: "Bath" },
  ];

  it("takes the largest collections when the store publishes sizes, dropping empty ones", () => {
    const listed = new Map([
      ["new", { title: "New", products: 20 }],
      ["bedding", { title: "Bedding", products: 124 }],
      ["empty", { title: "All layers", products: 0 }],
      ["bath", { title: "Bath", products: 86 }],
    ]);
    expect(pickMenu(menu, listed, 2).map((m) => m.handle)).toEqual(["bedding", "bath"]);
  });

  it("takes the first ones in page order when sizes aren't published", () => {
    expect(pickMenu(menu, new Map(), 2).map((m) => m.handle)).toEqual(["new", "bedding"]);
  });
});

describe("category names", () => {
  it("strips a prefix every title shares, at its separator", () => {
    const titles = ["PLP Commercial - All Sheets", "PLP Commercial - New Arrivals", "PLP Commercial - Bath Bundles"];
    expect(sharedPrefix(titles)).toBe("PLP Commercial - ");
    expect(sharedPrefix(["Bedding", "Bath"])).toBe("");
    expect(sharedPrefix(["Women's Tops", "Women's Bottoms"])).toBe("");
    expect(sharedPrefix(["Only one - title"])).toBe("");
  });

  it("prefers the store's own name, then clean menu text, then the handle", () => {
    expect(categoryTitle("PLP Commercial - All Sheets", "PLP Commercial - ", "Shop Sheets", "all-sheets")).toBe("All Sheets");
    expect(categoryTitle("Women's Loungewear", "", "Clothing", "womens-loungewear")).toBe("Women's Loungewear");
    expect(categoryTitle(undefined, "", "Bath Towels", "bath-towels")).toBe("Bath Towels");
    expect(categoryTitle(undefined, "", "Softest cotton ever → Shop Brushed Cotton", "brushed-cotton")).toBe("Brushed cotton");
  });

  it("rejects banner lines and buttons as labels", () => {
    expect(cleanLabel("Shop Now")).toBe("");
    expect(cleanLabel("SHOP ALL BEDDING")).toBe("");
    expect(cleanLabel("Throws for everyone. → Shop Throws")).toBe("");
    expect(cleanLabel(" Quilts & Coverlets ")).toBe("Quilts & Coverlets");
  });
});
