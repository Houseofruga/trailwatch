import { describe, expect, it } from "vitest";
import type { CatalogProduct, CatalogVariant } from "@/features/catalog/types";
import { annotateForUser, positionEvent } from "./annotate";
import { activeMatches, compatible, matchStatus, shortlist, type Classified, type PairRow, type Verdict } from "./candidates";
import { classInputHash, obviousClass, parseClassReply, relevantFirst } from "./classify";
import { compareMatched } from "./compare";
import { MATCHING_CONFIG as MATCHING_DEFAULTS } from "./config";
import { parseJudgeReply } from "./judge";
import { validClass } from "./taxonomy.config";
import type { ProductClass } from "./classify";
import { parseQuantity, pricePosition, sizeLabel, unitPriceText } from "./units";

// Fictional brands only: Luna Skin, Dewlane, Hearth & Pine, Glowfield.

let nextId = 1;
const v = (title: string, price: number, extra: Partial<CatalogVariant> = {}): CatalogVariant => ({
  id: String(nextId++),
  title,
  sku: null,
  price,
  compareAtPrice: null,
  available: true,
  ...extra,
});
const product = (title: string, variants: CatalogVariant[], extra: Partial<CatalogProduct> = {}): CatalogProduct => ({
  id: String(nextId++),
  handle: title.toLowerCase().replace(/\W+/g, "-"),
  title,
  productType: "",
  tags: [],
  vendor: "",
  createdAt: null,
  publishedAt: null,
  image: null,
  variants,
  ...extra,
});
const cls = (category: string, subcategory: string, extra: Partial<ProductClass> = {}): ProductClass => ({
  category: category as ProductClass["category"],
  subcategory,
  use: "",
  attributes: [],
  packType: "single",
  ...extra,
});

describe("parseQuantity", () => {
  it.each([
    ["Vitamin C Serum 30ml", 30, "ml"],
    ["Serum - 1 fl oz", 29.57, "ml"],
    ["Serum 1.7 fl. oz", 50.27, "ml"],
    ["Body Oil 0,5 L", 500, "ml"],
    ["Whipped Butter 8 oz", 226.8, "g"],
    ["Clay Mask 100g", 100, "g"],
    ["Coffee Beans 2 lb", 907.18, "g"],
    ["Travel Duo 2 x 30ml", 60, "ml"],
    ["Calming Chews 60 count", 60, "count"],
    ["Collagen Gummies (90 Gummies)", 90, "count"],
    ["Bath Towels Set of 4", 4, "count"],
    ["Sparkling Water 12-Pack", 12, "count"],
    ["Turkish Ribbed Hand Towels (Pair) - Deep Plum", 2, "count"],
  ])("%s → %s %s", (text, amount, unit) => {
    expect(parseQuantity(text)).toEqual({ amount, unit });
  });

  it("leaves unknown sizes unknown, and ignores thread counts and percentages", () => {
    expect(parseQuantity("Brightening Serum")).toBeNull();
    expect(parseQuantity("400 Thread Count Sateen Sheet Set")).toBeNull();
    expect(parseQuantity("15% Vitamin C, SPF 30")).toBeNull();
    expect(parseQuantity("1000mg Fish Oil")).toBeNull();
  });
});

describe("sizeLabel", () => {
  it("reads bedding and apparel sizes from variant titles", () => {
    expect(sizeLabel("Queen / White")).toBe("queen");
    expect(sizeLabel("California King")).toBe("cal king");
    expect(sizeLabel("Twin XL")).toBe("twin xl");
    expect(sizeLabel("Full/Queen / Sand")).toBe("full/queen");
    expect(sizeLabel("M / Black")).toBe("m");
    expect(sizeLabel("Mint")).toBeNull();
  });
});

describe("pricePosition", () => {
  it("compares unit prices of the closest sizes", () => {
    const theirs = product("Luna Skin Vitamin C Serum", [v("30ml", 3800)]);
    const ours = product("Glowfield Radiance Serum", [v("30ml", 4400), v("60ml", 7900)]);
    const pos = pricePosition(theirs, ours)!;
    expect(pos.basis).toBe("unit");
    expect(pos.unit).toBe("ml");
    expect(pos.ours.size).toBe("30ml");
    expect(Math.round(pos.theirs.unitPrice)).toBe(127);
    expect(pos.pctBelow).toBe(13.6);
  });

  it("compares the same named size, never Twin with King", () => {
    const theirs = product("Dewlane Linen Sheet Set", [v("Twin", 15900), v("Queen", 24900)]);
    const ours = product("Hearth Linen Core Sheet Set", [v("Queen / Sand", 27900), v("King / Sand", 29900)]);
    const pos = pricePosition(theirs, ours)!;
    expect(pos.basis).toBe("size");
    expect(pos.theirs.size).toBe("queen");
    expect([pos.theirs.price, pos.ours.price]).toEqual([24900, 27900]);
  });

  it("refuses unfair comparisons: one towel vs a set of 4, sizes out of range, clearance, sold out", () => {
    const set4 = product("Plush Bath Towels Set of 4", [v("Default Title", 16800)]);
    const single = product("Plush Bath Towel", [v("White", 4900)]);
    expect(pricePosition(single, set4)).toBeNull();
    expect(pricePosition(product("Mini Serum 10ml", [v("10ml", 1200)]), product("Serum 50ml", [v("50ml", 4000)]))).toBeNull();
    expect(pricePosition(product("Candle", [v("Default Title", 3000)]), product("Candle - Last Call", [v("Default Title", 4000)]))).toBeNull();
    expect(pricePosition(product("Candle", [v("Default Title", 3000, { available: false })]), product("Candle", [v("Default Title", 4000)]))).toBeNull();
  });

  it("compares one-size items item for item", () => {
    const pos = pricePosition(product("Wool Dryer Balls", [v("Default Title", 1500)]), product("Wool Dryer Balls", [v("Default Title", 1900)]))!;
    expect(pos.basis).toBe("item");
    expect(pos.pctBelow).toBe(21.1);
  });

  it("stays silent when an item-for-item gap is too big to be a fair comparison, or one side is a pair", () => {
    // $59 against $198 with no sizes on either: almost certainly a single against a set.
    expect(pricePosition(product("Ribbed Bath Towel", [v("Deep Plum", 5900)]), product("Plush Bath Towels", [v("White", 19800)]))).toBeNull();
    expect(pricePosition(product("Washcloths (Pair)", [v("Deep Plum", 2200)]), product("Plush Washcloths", [v("White", 2600)]))).toBeNull();
  });
});

describe("unitPriceText", () => {
  it("reads naturally", () => {
    expect(unitPriceText(126.67, "ml")).toBe("$1.27/ml");
    expect(unitPriceText(3.1, "g")).toBe("$3.10 per 100g");
    expect(unitPriceText(50, "count")).toBe("$0.50 each");
  });
});

describe("candidate filter", () => {
  const serum = (title: string, size: string, extra: Partial<ProductClass> = {}): Classified => ({
    product: product(title, [v(size, 4000)]),
    cls: cls("skincare", "serum", { use: "brightening serum", ...extra }),
  });

  it("never matches across categories or subcategories", () => {
    const mask = { product: product("Clay Mask", [v("50ml", 3000)]), cls: cls("skincare", "mask") };
    const shampoo = { product: product("Serum Shampoo", [v("30ml", 3000)]), cls: cls("haircare", "shampoo") };
    expect(compatible(serum("Radiance Serum", "30ml"), mask)).toBe(false);
    expect(compatible(serum("Radiance Serum", "30ml"), shampoo)).toBe(false);
    expect(compatible({ ...mask, cls: cls("other", "other") }, { ...mask, cls: cls("other", "other") })).toBe(false);
  });

  it("filters by size range and pack type", () => {
    const ours = serum("Radiance Serum", "30ml");
    expect(compatible(ours, serum("Luna Glow Serum", "50ml"))).toBe(true);
    expect(compatible(ours, serum("Luna Glow Serum", "100ml"))).toBe(false);
    expect(compatible(ours, serum("Luna Serum Duo", "30ml", { packType: "bundle" }))).toBe(false);
    expect(compatible(serum("Kit", "30ml", { packType: "kit" }), serum("Bundle", "30ml", { packType: "bundle" }))).toBe(true);
  });

  it("shortlists only compatible products, best lexical fit first", () => {
    const own = [serum("Radiance Vitamin C Serum", "30ml", { attributes: ["vitamin c"] }), serum("Retinol Night Serum", "30ml", { use: "retinol night serum" })];
    const comp = [serum("Luna Vitamin C Drops", "30ml", { attributes: ["vitamin c"] })];
    const list = shortlist(own, comp, { ...MATCHING_DEFAULTS, shortlistPerProduct: 1 });
    expect(list).toHaveLength(1);
    expect(list[0].own.product.title).toBe("Radiance Vitamin C Serum");
  });
});

describe("match status and user verdicts", () => {
  it("applies the confidence thresholds", () => {
    expect(matchStatus(0.9)).toBe("active");
    expect(matchStatus(0.8)).toBe("active");
    expect(matchStatus(0.6)).toBe("possible");
    expect(matchStatus(0.3)).toBe("discarded");
  });

  it("a rejected pair never comes back, however confident the model is", () => {
    expect(matchStatus(0.99, "rejected")).toBe("rejected");
    const pairs: PairRow[] = [{ ownProductId: "o1", compProductId: "c1", confidence: 0.95, reason: "Both serums" }];
    const verdicts = new Map<string, Verdict>([["o1:c1", "rejected"]]);
    expect(activeMatches(pairs, verdicts).size).toBe(0);
  });

  it("a confirmed or manually linked pair is always active and wins", () => {
    const pairs: PairRow[] = [
      { ownProductId: "o1", compProductId: "c1", confidence: 0.95, reason: "Both serums" },
      { ownProductId: "o2", compProductId: "c1", confidence: 0.6, reason: "Similar" },
    ];
    expect(activeMatches(pairs, new Map([["o2:c1", "confirmed" as Verdict]])).get("c1")?.ownProductId).toBe("o2");
    // A manual link for a pair the model never judged.
    const linked = activeMatches([], new Map([["o9:c7", "confirmed" as Verdict]]));
    expect(linked.get("c7")).toMatchObject({ ownProductId: "o9", reason: "Linked by you" });
  });
});

describe("price_position_change", () => {
  const ours = product("Glowfield Radiance Serum", [v("30ml", 4400)]);
  const pair: PairRow = { ownProductId: ours.id, compProductId: "x", confidence: 0.9, reason: "Both are 30ml vitamin C serums" };

  it("fires when a matched product moves at least 10% below yours", () => {
    const before = product("Luna Vitamin C Serum", [v("30ml", 4600)]);
    const after = { ...before, variants: [{ ...before.variants[0], price: 3800 }] };
    const e = positionEvent("user-1", after, ours, pair, "price_changed", before)!;
    expect(e.type).toBe("price_position_change");
    expect(e.forUserId).toBe("user-1");
    expect(e.payload).toMatchObject({ basis: "unit", unit: "ml", pctBelow: 13.6, competitorPrice: 3800, reason: pair.reason });
  });

  it("stays quiet when it was already below, or the gap is small", () => {
    const cheap = product("Luna Vitamin C Serum", [v("30ml", 3600)]);
    const cheaper = { ...cheap, variants: [{ ...cheap.variants[0], price: 3400 }] };
    expect(positionEvent("u", cheaper, ours, pair, "price_changed", cheap)).toBeNull();
    expect(positionEvent("u", product("Luna Serum", [v("30ml", 4200)]), ours, pair, "price_changed")).toBeNull();
  });

  it("fires for a new comparable launch priced below yours", () => {
    const launch = product("Luna Vitamin C Serum", [v("30ml", 3800)]);
    expect(positionEvent("u", launch, ours, pair, "product_launched")?.payload.trigger).toBe("product_launched");
  });

  it("annotates events only for active matches, and never for rejected ones", () => {
    const before = product("Luna Vitamin C Serum", [v("30ml", 4600)]);
    const after = { ...before, variants: [{ ...before.variants[0], price: 3800 }] };
    const events = [{ type: "price_changed" as const, productId: after.id, payload: {} }];
    const matches = activeMatches([{ ...pair, compProductId: after.id }], new Map());
    const hit = annotateForUser("u", events, [after], [before], [ours], matches);
    expect(hit.positions).toHaveLength(1);
    expect(hit.contexts.get(0)?.ownMatch.title).toBe(ours.title);
    const rejected = activeMatches([{ ...pair, compProductId: after.id }], new Map([[`${ours.id}:${after.id}`, "rejected" as Verdict]]));
    expect(annotateForUser("u", events, [after], [before], [ours], rejected).positions).toHaveLength(0);
  });

  it("the report lists only active matches priced below yours", () => {
    const luna = product("Luna Vitamin C Serum", [v("30ml", 3800)]);
    const pricey = product("Luna Night Serum", [v("30ml", 6000)]);
    const matches = activeMatches(
      [
        { ...pair, compProductId: luna.id },
        { ...pair, compProductId: pricey.id },
      ],
      new Map(),
    );
    const out = compareMatched([luna, pricey], [ours], matches);
    expect(out.similar).toBe(2);
    expect(out.cheaper).toEqual([{ title: "Luna Vitamin C Serum (30ml)", yourTitle: "Glowfield Radiance Serum (30ml)", price: 3800, yourPrice: 4400 }]);
  });
});

describe("classifier and judge replies", () => {
  it("keeps only taxonomy categories and valid pack types", () => {
    const out = parseClassReply(
      'Sure: {"items":[{"i":0,"c":"skincare","s":"serum","u":"Brightening Serum","a":["Vitamin C"],"p":"single"},{"i":1,"c":"skincare","s":"elixirs","u":"x","a":[],"p":"mega pack"},{"i":7,"c":"pet","s":"calming"}]}',
      2,
    );
    expect(out.get(0)).toEqual({ category: "skincare", subcategory: "serum", use: "brightening serum", attributes: ["vitamin c"], packType: "single" });
    expect(out.get(1)).toMatchObject({ category: "other", subcategory: "other", packType: "single" });
    expect(out.has(7)).toBe(false);
    expect(parseClassReply("not json", 2).size).toBe(0);
  });

  it("clamps judge scores", () => {
    const out = parseJudgeReply('{"pairs":[{"i":0,"score":1.4,"reason":"Both 30ml serums"},{"i":1,"score":-1}]}', 2);
    expect(out.get(0)).toEqual({ confidence: 1, reason: "Both 30ml serums" });
    expect(out.get(1)?.confidence).toBe(0);
  });

  it("skips the model for gift cards, and re-runs only when the product text changes", () => {
    expect(obviousClass(product("Digital Gift Card", [v("$50", 5000)]))?.category).toBe("other");
    const p = product("Radiance Serum", [v("30ml", 4400)]);
    expect(classInputHash({ ...p, variants: [{ ...p.variants[0], price: 3900 }] })).toBe(classInputHash(p));
    expect(classInputHash({ ...p, title: "Radiance Serum 2.0" })).not.toBe(classInputHash(p));
  });
});


describe("taxonomy", () => {
  it("snaps near misses to the closest subcategory and nothing else", () => {
    expect(validClass("home", "hand towels")).toEqual({ category: "home", subcategory: "towels" });
    expect(validClass("home", "sheet set")).toEqual({ category: "home", subcategory: "sheets" });
    expect(validClass("home", "Pillow")).toEqual({ category: "home", subcategory: "pillows" });
    expect(validClass("bedding", "duvet covers")).toEqual({ category: "home", subcategory: "duvet covers" });
    expect(validClass("home", "spaceships")).toEqual({ category: "other", subcategory: "other" });
    expect(validClass("other", "bed blanket")).toEqual({ category: "home", subcategory: "blankets" });
    expect(validClass("other", "Room spray")).toEqual({ category: "home", subcategory: "home fragrance" });
    expect(validClass("skincare", "")).toEqual({ category: "other", subcategory: "other" });
  });
});

describe("noisy store data", () => {
  it("drops system tags and recovers 'other' answers from the stated use", async () => {
    const { usefulTags } = await import("./classify");
    expect(usefulTags(["Discount Amount: 75", "DY Category 1: Bedding", "Active Last Call", "Linen", "feedonomics-include", "Organic"])).toEqual(["Linen", "Organic"]);
    const out = parseClassReply('{"items":[{"i":0,"c":"other","s":"","u":"Sham set","a":[],"p":"single"},{"i":1,"c":"other","s":"","u":"Duvet cover","a":[],"p":"single"},{"i":2,"c":"other","s":"","u":"Parking permit","a":[],"p":"single"}]}', 3);
    expect(out.get(0)).toMatchObject({ category: "home", subcategory: "pillowcases" });
    expect(out.get(1)).toMatchObject({ category: "home", subcategory: "duvet covers" });
    expect(out.get(2)).toMatchObject({ category: "other" });
  });
});

describe("free-tier pacing", () => {
  it("classifies a competitor's products of the kinds you sell first", () => {
    const sheets = product("Dewlane Percale Sheet Set", [v("Queen", 120)], { productType: "Sheets" });
    const candle = product("Dewlane Fig Candle", [v("Default Title", 38)], { productType: "Candles" });
    const towels = product("Dewlane Bath Towels", [v("Set of 2", 60)], { productType: " towels " });
    expect(relevantFirst([candle, sheets, towels], new Set(["sheets", "towels"])).map((p) => p.title)).toEqual([
      "Dewlane Percale Sheet Set",
      "Dewlane Bath Towels",
      "Dewlane Fig Candle",
    ]);
  });
});
