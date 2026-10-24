import { describe, expect, it } from "vitest";
import { kindOf, moveSummary, toMoves, type FeedRow } from "./moves";

const row = (over: Partial<FeedRow>): FeedRow => ({
  eventId: "e1",
  storeId: "s1",
  competitorId: "c1",
  competitorName: "Hearth & Pine",
  type: "product_launched",
  severity: "normal",
  payload: { title: "Organic Rib Knit Throw (Garnet)", price: 9900 },
  detectedAt: "2026-09-29T20:12:00Z",
  snapshotId: "snap1",
  meaning: null,
  ownMatch: null,
  ...over,
});

describe("moveSummary", () => {
  it("writes feed lines without the store name, dropping .00", () => {
    expect(moveSummary("product_launched", { title: "Organic Rib Knit Throw (Garnet)", price: 9900 })).toBe(
      "Launched Organic Rib Knit Throw (Garnet) at $99",
    );
    expect(moveSummary("price_changed", { title: "Luxe Sateen Flat Sheet", oldPrice: 8600, newPrice: 7740 })).toBe(
      "Price change: Luxe Sateen Flat Sheet $86 → $77.40",
    );
    expect(
      moveSummary("sale_started", { title: "Breezeweave Crinkle Cotton Sham Set - Last Call", compareAtPrice: 8900, salePrice: 1335, pctOff: 85 }),
    ).toBe("Breezeweave Crinkle Cotton Sham Set - Last Call: $89 → $13.35 (−85%)");
    expect(moveSummary("sitewide_sale_detected", { shareDiscounted: 34, maxPctOff: 60 })).toBe(
      "Sitewide sale: 34% of products discounted, up to −60%",
    );
    expect(moveSummary("sold_out", { title: "Wideboy Clock" })).toBe("Wideboy Clock sold out");
    expect(moveSummary("price_position_change", { title: "Linen Duvet Cover", competitorPrice: 16900, ownPrice: 18900 })).toBe(
      "Cheaper than you: Linen Duvet Cover is $169, yours is $189",
    );
    expect(
      moveSummary("price_position_change", {
        title: "Linen Duvet Cover",
        competitorPrice: 16900,
        ownPrice: 18900,
        ownTitle: "Flax Duvet Cover",
        competitorSize: "queen",
        ownSize: "queen",
        basis: "size",
        pctBelow: 10.6,
      }),
    ).toBe("Cheaper than you: Linen Duvet Cover (queen) is $169, 11% less than your Flax Duvet Cover at $189");
    expect(
      moveSummary("price_position_change", {
        title: "Glow Serum",
        competitorPrice: 3800,
        ownPrice: 4400,
        ownTitle: "Radiance Serum",
        competitorSize: "30ml",
        ownSize: "50ml",
        competitorUnitPrice: 127,
        ownUnitPrice: 88,
        basis: "unit",
        unit: "ml",
        pctBelow: 12,
      }),
    ).toBe("Cheaper than you: Glow Serum (30ml) is $38 ($1.27/ml), your Radiance Serum (50ml) is $44 ($0.88/ml)");
    expect(moveSummary("policy_change", { summary: "Changed the returns policy." })).toBe("Changed the returns policy");
  });

  it("maps every type to a filter kind", () => {
    expect(kindOf("restocked")).toBe("stock");
    expect(kindOf("positioning_shift")).toBe("promo");
    expect(kindOf("price_position_change")).toBe("undercut");
  });
});

describe("toMoves", () => {
  it("bundles launches from the same catalog read and leads with the high one", () => {
    const colours = ["Ink", "Tobacco", "Sage", "Oat", "Rust"];
    const rows = colours.map((c, i) =>
      row({ eventId: `e${i}`, payload: { title: `Boucle Ball Pillow (${c})`, price: 7900 }, severity: i === 2 ? "high" : "normal" }),
    );
    const [move] = toMoves(rows);
    expect(toMoves(rows)).toHaveLength(1);
    expect(move.summary).toBe("Launched 5 products: Boucle Ball Pillow (Ink), (Tobacco), +3");
    expect(move.priority).toBe("high");
    expect(move.id).toBe("e2");
    expect(move.bundle).toHaveLength(5);
  });

  it("bundles a day's checks together, and keeps other days, stores and types apart", () => {
    expect(toMoves([row({ eventId: "a" }), row({ eventId: "a2", snapshotId: "snap2", detectedAt: "2026-09-29T23:50:00Z" })])).toHaveLength(1);
    const moves = toMoves([
      row({ eventId: "a" }),
      row({ eventId: "b", snapshotId: "snap2", detectedAt: "2026-09-30T08:00:00Z" }),
      row({ eventId: "c", storeId: "s2" }),
      row({ eventId: "d", type: "sold_out", payload: { title: "X" } }),
      row({ eventId: "e", type: "policy_change", payload: { summary: "Raised the free-shipping threshold." } }),
    ]);
    expect(moves.map((m) => m.id)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("bundles a read's price cuts into one move, apart from its price rises", () => {
    const cut = (id: string, title: string, oldPrice: number, newPrice: number) =>
      row({ eventId: id, type: "price_changed", payload: { title, oldPrice, newPrice, pctChange: Math.round(((newPrice - oldPrice) / oldPrice) * 1000) / 10 } });
    const moves = toMoves([
      cut("p1", "Signature Sheet Set - Camel", 20000, 13700),
      cut("p2", "Signature Sheet Set - Olive", 20000, 13700),
      cut("p3", "Linen Sheet Set - Sage", 35000, 24000),
      cut("p4", "Waffle Robe", 9800, 11800),
    ]);
    expect(moves.map((m) => m.summary)).toEqual([
      "Cut prices on 3 products: Signature Sheet Set - Camel $200 → $137, +2",
      "Price change: Waffle Robe $98 → $118",
    ]);
    expect(moves[0].bundle?.map((b) => b.price)).toEqual([13700, 13700, 24000]);
  });

  it("bundles a read's sell-outs, restocks and removals, naming colours once", () => {
    const out = (id: string, title: string) => row({ eventId: id, type: "sold_out", payload: { title } });
    const [m] = toMoves([out("o1", "Percale Bundle - Evergreen"), out("o2", "Percale Bundle - Cream"), out("o3", "Linen Sham")]);
    expect(m.summary).toBe("3 products sold out: Percale Bundle - Evergreen, Cream, +1");
    expect(toMoves([row({ eventId: "r1", type: "restocked", payload: { title: "A" } }), row({ eventId: "r2", type: "restocked", payload: { title: "B" } })])[0].summary).toBe(
      "2 products back in stock: A, B",
    );
    expect(toMoves([row({ eventId: "x1", type: "product_removed", payload: { title: "A" } }), row({ eventId: "x2", type: "product_removed", payload: { title: "B" } })])[0].summary).toBe(
      "Removed 2 products from the store: A, B",
    );
  });

  it("adds the comparison with the reader's own product", () => {
    const [m] = toMoves([
      row({
        type: "sale_started",
        payload: { title: "Honeycomb Duvet Cover", compareAtPrice: 26900, salePrice: 10800, pctOff: 60 },
        ownMatch: { title: "Waffle Duvet Cover", price: 18900 },
      }),
    ]);
    expect(m.comparedWithYours).toBe("Your Waffle Duvet Cover is $189, $81 more.");
  });
});
