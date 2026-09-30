import { describe, expect, it } from "vitest";
import { product, variant } from "@/features/catalog/fixtures";
import type { CatalogEvent } from "@/features/catalog/diff";
import { describeEvent } from "@/features/alerts/describe";
import { buildBriefingMessage } from "@/features/briefing/prompt";
import { annotateForUser } from "./annotate";
import { baseTitle, buildOwnIndex, compareCatalogs, headlinePrice, packaging, similarity, titleTokens, undercut } from "./match";

describe("titleTokens", () => {
  it("drops brand, sizes, numbers, packaging words and folds plurals", () => {
    expect([...titleTokens("Dewlane Barrier Repair Night Cream 50ml - Set of 2", "Dewlane")]).toEqual([
      "barrier",
      "repair",
      "night",
      "cream",
    ]);
    expect([...titleTokens("Merino Crew Sweaters (Last Call)")]).toEqual(["merino", "crew", "sweater"]);
  });
});

describe("similarity", () => {
  const cream = (title: string, productType = "Moisturizer", vendor = "") => product(title, { title, productType, vendor });

  it("scores comparable products high and unrelated ones low", () => {
    expect(similarity(cream("Barrier Repair Night Cream", "Moisturizer", "Dewlane"), cream("Overnight Barrier Repair Cream", "Moisturizer", "Glowfield"))).toBeGreaterThanOrEqual(0.5);
    expect(similarity(cream("Barrier Repair Night Cream"), cream("Vitamin C Brightening Serum"))).toBeLessThan(0.5);
  });

  it("nudges by product type: same type up, different type down", () => {
    const a = cream("Hydrating Face Mist", "Toner");
    const same = cream("Hydrating Face Mist", "Toner");
    const other = cream("Hydrating Face Mist", "Candle");
    expect(similarity(a, same)).toBe(1);
    expect(similarity(a, other)).toBeCloseTo(0.8);
  });
});

describe("buildOwnIndex", () => {
  const own = [
    product("o1", { title: "Overnight Barrier Repair Cream", productType: "Moisturizer", vendor: "Glowfield" }),
    product("o2", { title: "Daily Vitamin C Serum", productType: "Serum", vendor: "Glowfield" }),
    product("o3", { title: "Gentle Foaming Cleanser", productType: "Cleanser", vendor: "Glowfield" }),
  ];
  const bestMatch = buildOwnIndex(own);

  it("finds the user's comparable product", () => {
    const theirs = product("t1", { title: "Barrier Repair Night Cream", productType: "Moisturizer", vendor: "Dewlane" });
    expect(bestMatch(theirs)?.product.id).toBe("o1");
  });

  it("returns null when nothing is comparable enough", () => {
    expect(bestMatch(product("t2", { title: "Scented Soy Candle", productType: "Home" }))).toBeNull();
  });
});

describe("undercut", () => {
  const mine = product("o", { variants: [variant({ price: 5200 })] });

  it("flags a competitor at least 5% below you", () => {
    expect(undercut(product("t", { variants: [variant({ price: 4800 })] }), mine, 1)).toEqual({
      competitorPrice: 4800,
      ownPrice: 5200,
      pctBelow: 7.7,
    });
  });

  it("ignores small gaps, higher prices and sold-out products", () => {
    expect(undercut(product("t", { variants: [variant({ price: 5100 })] }), mine, 1)).toBeNull();
    expect(undercut(product("t", { variants: [variant({ price: 6000 })] }), mine, 1)).toBeNull();
    expect(undercut(product("t", { variants: [variant({ price: 3000, available: false })] }), mine, 1)).toBeNull();
  });

  it("uses the cheapest in-stock variant as the headline price", () => {
    const p = product("t", {
      variants: [variant({ id: "a", price: 2000, available: false }), variant({ id: "b", price: 3000 }), variant({ id: "c", price: 4000 })],
    });
    expect(headlinePrice(p)).toBe(3000);
  });
});

describe("real-catalog regressions (Parachute vs Brooklinen, 2026-09-30)", () => {
  const priced = (title: string, price: number) => product(title, { title, variants: [variant({ price })] });

  it("matches on the base title, ignoring color/variant suffixes", () => {
    expect(baseTitle("Percale Duvet Cover Set - Adobe Stripe")).toBe("Percale Duvet Cover Set");
    expect(baseTitle("Classic Turkish Cotton Towels (Thyme)")).toBe("Classic Turkish Cotton Towels");
    expect(baseTitle("Classic Percale Duvet Cover - Last Call")).toBe("Classic Percale Duvet Cover");
    expect(
      similarity(product("a", { title: "Percale Duvet Cover Set - Pebble Stripe" }), product("b", { title: "Classic Percale Duvet Cover - Last Call" })),
    ).toBeGreaterThanOrEqual(0.75);
  });

  it("reads packaging from the full title", () => {
    expect(packaging("Plush Turkish Cotton Bath Towel Set")).toEqual({ multi: true, count: null, mini: false });
    expect(packaging("Washcloths Set of 2")).toEqual({ multi: true, count: 2, mini: false });
    expect(packaging("Serum 3-Pack")).toEqual({ multi: true, count: 3, mini: false });
    expect(packaging("Down Alternative Mini Lumbar Pillow")).toEqual({ multi: false, count: null, mini: true });
    expect(packaging("Down Pillow")).toEqual({ multi: false, count: null, mini: false });
  });

  it("no undercut: one towel vs a towel set", () => {
    expect(undercut(priced("Classic Turkish Cotton Towel", 1400), priced("Plush Turkish Cotton Bath Towel Set", 5900), 0.9)).toBeNull();
  });

  it("no undercut: mini vs full size", () => {
    expect(undercut(priced("Down Alternative Mini Lumbar Pillow", 3000), priced("Down Alternative Lumbar Pillow", 3900), 1)).toBeNull();
  });

  it("no undercut on a weak match (liner vs curtain scored 0.65)", () => {
    expect(undercut(priced("Shower Curtain Liner", 2900), priced("Linen Shower Curtain", 9900), 0.65)).toBeNull();
  });

  it("still an undercut for a strong, like-for-like match", () => {
    expect(undercut(priced("Down Pillow", 12900), priced("Down Pillow", 14900), 1)).toMatchObject({ pctBelow: 13.4 });
    expect(undercut(priced("Sateen Sheet Set of 4", 17900), priced("Luxe Sateen Sheet Set of 4", 21900), 0.8)).not.toBeNull();
  });
});

describe("annotateForUser", () => {
  const own = [product("o1", { title: "Overnight Barrier Repair Cream", productType: "Moisturizer", variants: [variant({ price: 5200 })] })];
  const theirs = [
    product("t1", { title: "Barrier Repair Night Cream", productType: "Moisturizer", variants: [variant({ price: 4800 })] }),
    product("t2", { title: "Scented Soy Candle", productType: "Home" }),
  ];

  it("attaches the comparable product and emits a per-user undercut on a price move", () => {
    const events: CatalogEvent[] = [
      { type: "product_launched", productId: "t1", payload: { title: "Barrier Repair Night Cream" } },
      { type: "product_launched", productId: "t2", payload: { title: "Scented Soy Candle" } },
      { type: "sitewide_sale_detected", productId: null, payload: {} },
    ];
    const { contexts, undercuts } = annotateForUser("user-1", events, theirs, own);
    expect(contexts.get(0)?.ownMatch).toMatchObject({ title: "Overnight Barrier Repair Cream", price: 5200 });
    expect(contexts.has(1)).toBe(false);
    expect(contexts.has(2)).toBe(false);
    expect(undercuts).toHaveLength(1);
    expect(undercuts[0]).toMatchObject({
      type: "price_undercut",
      severity: "high",
      forUserId: "user-1",
      productId: "t1",
      payload: { competitorPrice: 4800, ownPrice: 5200, pctBelow: 7.7, ownTitle: "Overnight Barrier Repair Cream", trigger: "product_launched" },
    });
  });

  it("matches but never flags an undercut on a non-price event", () => {
    const { contexts, undercuts } = annotateForUser(
      "u",
      [{ type: "restocked", productId: "t1", payload: {} }],
      theirs,
      own,
    );
    expect(contexts.size).toBe(1);
    expect(undercuts).toEqual([]);
  });

  it("does nothing without an own catalog", () => {
    const { contexts, undercuts } = annotateForUser("u", [{ type: "price_changed", productId: "t1", payload: {} }], theirs, []);
    expect(contexts.size).toBe(0);
    expect(undercuts).toEqual([]);
  });
});

describe("undercut in words", () => {
  it("describes the undercut against the user's product", () => {
    expect(
      describeEvent(
        "price_undercut",
        { title: "Barrier Repair Night Cream", competitorPrice: 4800, ownPrice: 5200, pctBelow: 7.7, ownTitle: "Overnight Barrier Repair Cream" },
        "Dewlane",
      ),
    ).toBe("Dewlane's Barrier Repair Night Cream is now $48, 7.7% below your Overnight Barrier Repair Cream ($52).");
  });

  it("marks matched moves for the briefing model", () => {
    const msg = buildBriefingMessage({
      weekOf: "2026-10-05",
      events: [
        {
          storeId: "d",
          storeName: "Dewlane",
          type: "product_launched",
          severity: "high",
          payload: { title: "Barrier Repair Night Cream", price: 4800 },
          detectedAt: "2026-10-01T00:00:00Z",
          ownMatch: { title: "Overnight Barrier Repair Cream", price: 5200 },
        },
      ],
    });
    expect(msg).toContain("Dewlane launched Barrier Repair Night Cream at $48. [vs your Overnight Barrier Repair Cream at $52]");
  });
});

describe("compareCatalogs", () => {
  it("counts comparable products and lists the cheaper ones, biggest gap first", () => {
    const own = [
      product("o1", { title: "Linen Duvet Cover", productType: "Duvet Covers", variants: [variant({ price: 18900 })] }),
      product("o2", { title: "Percale Sheet Set", productType: "Sheets", variants: [variant({ price: 15000 })] }),
    ];
    const theirs = [
      product("c1", { title: "Linen Duvet Cover", productType: "Duvet Covers", variants: [variant({ price: 16900 })] }),
      product("c2", { title: "Percale Sheet Set", productType: "Sheets", variants: [variant({ price: 16000 })] }),
      product("c3", { title: "Wideboy Clock", productType: "Decor", variants: [variant({ price: 2900 })] }),
    ];
    expect(compareCatalogs(theirs, own)).toEqual({
      similar: 2,
      cheaper: [{ title: "Linen Duvet Cover", yourTitle: "Linen Duvet Cover", price: 16900, yourPrice: 18900 }],
    });
    expect(compareCatalogs(theirs, [])).toEqual({ similar: 0, cheaper: [] });
  });
});
