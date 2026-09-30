import { describe, expect, it } from "vitest";
import { buildFirstReport, catalogStats } from "./firstReport";
import { product, variant } from "./fixtures";

const NOW = new Date("2026-09-30T12:00:00Z");

describe("buildFirstReport", () => {
  const catalog = [
    product("old", { publishedAt: "2026-01-01T00:00:00Z" }),
    product("new1", { publishedAt: "2026-09-20T00:00:00Z", title: "Barrier Repair Night Cream" }),
    product("new2", { publishedAt: "2026-09-28T00:00:00Z" }),
    product("future", { publishedAt: "2026-12-01T00:00:00Z" }),
    product("sale10", { variants: [variant({ price: 4500, compareAtPrice: 5000 })] }),
    product("sale40", { variants: [variant({ price: 3000, compareAtPrice: 5000 })] }),
    product("saleSoldOut", { variants: [variant({ price: 1000, compareAtPrice: 5000, available: false })] }),
    product("gone", { variants: [variant({ id: "a", available: false }), variant({ id: "b", available: false })] }),
  ];
  const report = buildFirstReport(catalog, NOW);

  it("lists products launched in the last 30 days, newest first (not future-dated ones)", () => {
    expect(report.recentlyLaunched.map((i) => i.id)).toEqual(["new2", "new1"]);
    expect(report.recentlyLaunched[1]).toMatchObject({ title: "Barrier Repair Night Cream", launchedAt: "2026-09-20T00:00:00Z" });
  });

  it("lists in-stock products on sale, biggest discount first", () => {
    expect(report.onSaleNow.map((i) => [i.id, i.pctOff])).toEqual([
      ["sale40", 40],
      ["sale10", 10],
    ]);
    expect(report.onSaleNow[0]).toMatchObject({ price: 3000, compareAtPrice: 5000 });
  });

  it("lists fully sold-out products", () => {
    expect(report.soldOut.map((i) => i.id)).toEqual(["saleSoldOut", "gone"]);
  });

  it("includes catalog stats", () => {
    expect(report.stats).toMatchObject({ productCount: 8, onSaleCount: 3, soldOutCount: 2 });
  });
});

describe("catalogStats", () => {
  it("averages each product's cheapest variant and skips untracked products", () => {
    const stats = catalogStats([
      product("a", { variants: [variant({ id: "1", price: 1000 }), variant({ id: "2", price: 3000 })] }),
      product("b", { variants: [variant({ price: 2000 })] }),
      product("c", { variants: [] }),
    ]);
    expect(stats).toEqual({ productCount: 3, onSaleCount: 0, soldOutCount: 0, avgPrice: 1500 });
  });

  it("handles an empty catalog", () => {
    expect(catalogStats([])).toEqual({ productCount: 0, onSaleCount: 0, soldOutCount: 0, avgPrice: null });
  });
});
