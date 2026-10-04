import { describe, expect, it } from "vitest";
import type { CatalogProduct, CatalogVariant } from "@/features/catalog/types";
import type { Classified } from "@/features/matching/candidates";
import type { ProductClass } from "@/features/matching/classify";
import { renderBriefingEmail } from "@/features/briefing/render";
import {
  bestsellerSignals,
  handlesFromProductsJson,
  listedOrder,
  pickBestsellerCollection,
  positionOf,
  readBestsellers,
  type BestsellerSnapshot,
} from "./bestsellers";
import { assortmentGaps, buildOpportunities, evidenceLine, gapThreshold, mergeOpportunities, momentum, type CompetitorSignals } from "./build";
import { bestsellersDue } from "./crawl";
import { demandSignals, longFeatured, nextFeaturedSince } from "./demand";

// Fictional brands only: Fernwood, Hearth & Pine, Dewlane, Larkspur Home, Mossgate, Brindle & Co, Oakhaven.

const NOW = Date.parse("2026-10-04T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

let nextId = 1;
const v = (price: number, extra: Partial<CatalogVariant> = {}): CatalogVariant => ({
  id: String(nextId++),
  title: "Default Title",
  sku: null,
  price,
  compareAtPrice: null,
  available: true,
  ...extra,
});
const item = (title: string, sub: string, price: number, extra: { cat?: string; pack?: ProductClass["packType"]; published?: string } = {}): Classified => {
  const product: CatalogProduct = {
    id: String(nextId++),
    handle: title.toLowerCase().replace(/\W+/g, "-"),
    title,
    productType: "",
    tags: [],
    vendor: "",
    createdAt: null,
    publishedAt: extra.published ?? daysAgo(400),
    image: null,
    variants: [v(price)],
  };
  return {
    product,
    cls: { category: (extra.cat ?? "home") as ProductClass["category"], subcategory: sub, use: "", attributes: [], packType: extra.pack ?? "single" },
  };
};
const store = (name: string, products: Classified[], extra: Partial<CompetitorSignals> = {}): CompetitorSignals => ({
  storeId: name.toLowerCase().replace(/\W+/g, "-"),
  storeName: name,
  products,
  bestsellers: null,
  rising: [],
  demand: [],
  featured: new Map(),
  ...extra,
});
const snap = (members: string[], rankedCount: number, fetchedAt = daysAgo(0)): BestsellerSnapshot => ({ members, rankedCount, fetchedAt });

describe("Best Sellers collection (B1)", () => {
  it("uses the store's plain list and never a campaign or data collection", () => {
    expect(pickBestsellerCollection(["summer-sale-best-sellers", "collection-data-best-sellers", "best-sellers", "most-popular"])).toBe("best-sellers");
    expect(pickBestsellerCollection(["best-sellers-feature", "most-popular"])).toBe("most-popular");
    expect(pickBestsellerCollection(["womens-bestsellers", "spring-bestsellers"])).toBe("womens-bestsellers");
    expect(pickBestsellerCollection(["order-tracking-best-sellers", "new-arrivals"])).toBeNull();
  });

  it("reads members from products.json and positions from the page order", () => {
    expect(handlesFromProductsJson('{"products":[{"handle":"Linen-Sheets"},{"handle":"waffle-towel"}]}')).toEqual(["linen-sheets", "waffle-towel"]);
    expect(handlesFromProductsJson("<html>")).toBeNull();
    const html = '<a href="/products/nav-pick">x</a><a href="/collections/best-sellers/products/waffle-towel">a</a><a href="/products/linen-sheets">b</a><a href="/products/waffle-towel">again</a>';
    expect(listedOrder(html, ["linen-sheets", "waffle-towel"])).toEqual(["waffle-towel", "linen-sheets"]);
  });

  it("trusts positions only when the page lists enough of the list", () => {
    const members = ["a", "b", "c", "d", "e"];
    const ranked = readBestsellers(members, ["c", "a", "b", "d"], daysAgo(0));
    expect(ranked.members.slice(0, 4)).toEqual(["c", "a", "b", "d"]);
    expect(positionOf(ranked, "c")).toBe(1);
    expect(positionOf(ranked, "e")).toBeNull(); // a member, but its position isn't known

    const sparse = readBestsellers(members, ["c"], daysAgo(0));
    expect(sparse.rankedCount).toBe(0);
    expect(positionOf(sparse, "c")).toBeNull();
    expect(sparse.members).toEqual(members);
  });

  it("detects a product entering the top, a fast climb and a fast-rising launch; nothing guessed on the first read", () => {
    const long = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);
    const prev = snap(long(30), 30, daysAgo(7));
    const order = long(30);
    // p25 jumps to #3; p14 climbs to #4 (from 14, entering the top 10 too); new launch "fresh" at #2.
    const curr = snap(["p1", "fresh", "p25", "p14", ...order.filter((h) => !["p1", "p25", "p14"].includes(h))], 31);
    const published = new Map([["fresh", daysAgo(5)]]);
    const kinds = Object.fromEntries(bestsellerSignals(prev, curr, published, NOW).map((s) => [s.handle, s.kind]));
    expect(kinds).toMatchObject({ fresh: "launch_top", p25: "entered_top", p14: "entered_top" });
    expect(bestsellerSignals(null, curr, new Map(), NOW)).toEqual([]);
    // A climb outside the top: #28 → #15.
    const climb = snap([...order.slice(0, 14).filter((h) => h !== "p28"), "p28", ...order.slice(14).filter((h) => h !== "p28")], 30);
    expect(bestsellerSignals(prev, climb, new Map(), NOW)).toContainEqual({ handle: "p28", kind: "climbed", position: 15, from: 28 });
  });

  it("is rechecked daily, or weekly while a store has no usable list", () => {
    expect(bestsellersDue({ bestseller_status: null, bestseller_checked_at: null }, NOW)).toBe(true);
    expect(bestsellersDue({ bestseller_status: "available", bestseller_checked_at: daysAgo(0.5) }, NOW)).toBe(false);
    expect(bestsellersDue({ bestseller_status: "available", bestseller_checked_at: daysAgo(1) }, NOW)).toBe(true);
    expect(bestsellersDue({ bestseller_status: "unavailable", bestseller_checked_at: daysAgo(3) }, NOW)).toBe(false);
    expect(bestsellersDue({ bestseller_status: "unavailable", bestseller_checked_at: daysAgo(8) }, NOW)).toBe(true);
  });
});

describe("demand signals (B2)", () => {
  it("counts sold-out → restocked cycles and launches that sell out fast", () => {
    const events = [
      { productId: "1", type: "sold_out" as const, detectedAt: daysAgo(80) },
      { productId: "1", type: "restocked" as const, detectedAt: daysAgo(70) },
      { productId: "1", type: "sold_out" as const, detectedAt: daysAgo(20) },
      { productId: "1", type: "restocked" as const, detectedAt: daysAgo(10) },
      { productId: "2", type: "restocked" as const, detectedAt: daysAgo(10) }, // no sell-out seen: not a cycle
      { productId: "3", type: "product_launched" as const, detectedAt: daysAgo(12) },
      { productId: "3", type: "sold_out" as const, detectedAt: daysAgo(9) },
    ];
    const out = demandSignals(events, NOW);
    expect(out).toContainEqual({ productId: "1", restocks30: 1, restocks90: 2, soldOutAfterDays: null });
    expect(out).toContainEqual({ productId: "3", restocks30: 0, restocks90: 0, soldOutAfterDays: 3 });
    expect(out.find((d) => d.productId === "2")).toBeUndefined();
  });

  it("tracks how long products stay on the homepage", () => {
    const since = nextFeaturedSince({ "linen-sheets": daysAgo(30), gone: daysAgo(40) }, ["linen-sheets", "new-towel"], daysAgo(0));
    expect(Object.keys(since)).toEqual(["linen-sheets", "new-towel"]);
    expect(since["linen-sheets"]).toBe(daysAgo(30));
    expect(longFeatured(since, ["linen-sheets", "new-towel"], NOW)).toEqual(new Map([["linen-sheets", 30]]));
  });
});

describe("assortment gaps (B3)", () => {
  const own = [item("Larkspur Percale Sheets", "sheets", 12000), item("Larkspur Duvet Cover", "duvet covers", 18000)];

  it("needs at least 2 competitors (or 40% of the ones tracked) selling what you don't", () => {
    expect(gapThreshold(1)).toBe(1);
    expect(gapThreshold(5)).toBe(2);
    expect(gapThreshold(10)).toBe(2);
    const sheetsOnly = ["Dewlane", "Mossgate", "Brindle & Co", "Oakhaven"].map((n) => store(n, [item(`${n} Sheets`, "sheets", 9000)]));
    const one = [store("Fernwood", [item("Fernwood Bath Towel", "towels", 4000)]), ...sheetsOnly];
    expect(assortmentGaps(own, one, NOW).filter((o) => o.kind === "category_gap")).toEqual([]);
    const two = [...one, store("Hearth & Pine", [item("Hearth & Pine Waffle Towel", "towels", 3800)])];
    const gap = assortmentGaps(own, two, NOW).find((o) => o.key === "category_gap:home/towels");
    expect(gap?.noticed).toMatch(/^2 of your 6 competitors sell towels, and you don't\./);
    expect(gap?.evidence.competitors.map((c) => c.storeName)).toEqual(["Fernwood", "Hearth & Pine"]);
  });

  it("stays inside your categories", () => {
    const pets = [store("Fernwood", [item("Fernwood Dog Bed", "beds", 9000, { cat: "pet" })]), store("Dewlane", [item("Dewlane Dog Bed", "beds", 8000, { cat: "pet" })])];
    expect(assortmentGaps(own, pets, NOW)).toEqual([]);
  });

  it("finds format and entry-price gaps", () => {
    const comps = [
      store("Fernwood", [item("Fernwood Travel Pillowcase", "pillowcases", 1800, { pack: "travel size" })]),
      store("Dewlane", [item("Dewlane Mini Sheet Set", "sheets", 2200, { pack: "travel size" })]),
    ];
    const keys = assortmentGaps(own, comps, NOW).map((o) => o.key);
    expect(keys).toContain("format_gap:travel size");
    // Travel sizes aren't "single", so no entry-price gap from them alone.
    expect(keys).not.toContain("price_tier_gap:entry");
    const entry = [store("Fernwood", [item("Fernwood Eye Pillow", "pillows", 2000)]), store("Dewlane", [item("Dewlane Sachet", "decor", 1500)])];
    const tier = assortmentGaps(own, entry, NOW).find((o) => o.kind === "price_tier_gap");
    expect(tier?.noticed).toContain("your lowest regular price is $120");
  });

  it("ranks by signal strength: a gap in competitors' Best Sellers outranks one that isn't", () => {
    const towelA = item("Fernwood Bath Towel", "towels", 4000);
    const comps = [
      store("Fernwood", [towelA, item("Fernwood Candle", "candles", 3000)], { bestsellers: snap([towelA.product.handle], 1) }),
      store("Dewlane", [item("Dewlane Towel", "towels", 3500), item("Dewlane Candle", "candles", 2800)]),
    ];
    const [first, second] = assortmentGaps(own, comps, NOW).filter((o) => o.kind === "category_gap");
    expect(first.key).toBe("category_gap:home/towels");
    expect(first.score).toBeGreaterThan(second.score);
    expect(first.noticed).toContain("Fernwood's Fernwood Bath Towel is #1 in their Best Sellers.");
  });

  it("finds no gaps without your own store", () => {
    const comps = [store("Fernwood", [item("Fernwood Towel", "towels", 4000)]), store("Dewlane", [item("Dewlane Towel", "towels", 3500)])];
    expect(buildOpportunities(null, comps, NOW).filter((o) => o.kind.endsWith("_gap"))).toEqual([]);
  });
});

describe("momentum and demand items", () => {
  it("describes ranking and stock signals, never sales", () => {
    const launch = item("Fernwood Linen Duvet", "duvet covers", 21000, { published: daysAgo(6) });
    const restocked = item("Fernwood Waffle Towel", "towels", 4000);
    const s = store("Fernwood", [launch, restocked], {
      bestsellers: snap([launch.product.handle], 1),
      rising: [{ handle: launch.product.handle, kind: "launch_top", position: 1, from: null }],
      demand: [{ productId: restocked.product.id, restocks30: 1, restocks90: 3, soldOutAfterDays: null }],
    });
    const own = [item("Larkspur Duvet Cover", "duvet covers", 18000)];
    const out = momentum(own, [s], NOW);
    const rising = out.find((o) => o.kind === "rising_product")!;
    expect(rising.noticed).toBe("Fernwood's new Fernwood Linen Duvet, launched 6 days ago, is already #1 in their Best Sellers.");
    expect(rising.action).toContain("your comparable duvet covers");
    const demand = out.find((o) => o.kind === "demand")!;
    expect(demand.noticed).toBe("Fernwood's Fernwood Waffle Towel sold out and was restocked 3 times in the last 90 days.");
    for (const o of out) expect(`${o.noticed} ${o.action}`).not.toMatch(/\b(sold \d+|units|sales of|revenue)\b/i);
  });
});

describe("dismissal", () => {
  const opp = (key: string, score: number) => ({ key, kind: "category_gap" as const, score, noticed: "", action: "", evidence: { competitors: [], signals: [] } });

  it("keeps dismissed ones away unless the evidence gets much stronger, and 'not relevant' ones for good", () => {
    const stored = [
      { key: "a", status: "dismissed" as const, dismissedScore: 6 },
      { key: "b", status: "dismissed" as const, dismissedScore: 6 },
      { key: "c", status: "not_relevant" as const, dismissedScore: 4 },
      { key: "gone", status: "open" as const, dismissedScore: null },
      { key: "old-dismissal", status: "dismissed" as const, dismissedScore: 5 },
    ];
    const { upsert, remove } = mergeOpportunities([opp("a", 7), opp("b", 9), opp("c", 40), opp("new", 3)], stored);
    const status = Object.fromEntries(upsert.map((o) => [o.key, o.status]));
    expect(status).toEqual({ a: "dismissed", b: "open", c: "not_relevant", new: "open" });
    expect(remove).toEqual(["gone"]); // open and no longer true; dismissals are remembered
  });
});

describe("briefing section (B4)", () => {
  it("shows up to three opportunities with evidence and one action, quiet weeks included", () => {
    const evidence = evidenceLine({
      competitors: [
        { storeId: "f", storeName: "Fernwood", products: [] },
        { storeId: "m", storeName: "Mossgate", products: [] },
      ],
      signals: ["2 of 5 competitors", "Fernwood Mini Kit: #4 in Fernwood's Best Sellers"],
    });
    expect(evidence).toBe("Fernwood, Mossgate · Fernwood Mini Kit: #4 in Fernwood's Best Sellers");
    const o = { id: "1", kind: "format_gap" as const, noticed: "2 of your 5 competitors offer kits, and you don't.", evidence, action: "Consider a kit built around your best-selling product." };
    const email = renderBriefingEmail({
      input: { weekOf: "2026-10-05", events: [], opportunities: [o, o, o, o] },
      interpretation: { topMoves: [], whatThisMeans: null, suggestedMove: "" },
      siteUrl: "https://example.test",
      movesThisMonth: 0,
      competitors: [{ id: "c1", name: "Fernwood", storeId: "f" }],
    });
    expect(email.text).toContain("OPPORTUNITIES");
    expect(email.text.match(/• 2 of your 5 competitors offer kits/g)).toHaveLength(3);
    expect(email.text).toContain("  Evidence: Fernwood, Mossgate · Fernwood Mini Kit: #4 in Fernwood's Best Sellers");
    expect(email.html).toContain("Opportunities");
  });
});
