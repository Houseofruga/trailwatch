import { describe, expect, it } from "vitest";
import { diffCatalogs, type CatalogEvent } from "./diff";
import { product, variant } from "./fixtures";

const types = (events: CatalogEvent[]) => events.map((e) => e.type).sort();

describe("diffCatalogs — every event type", () => {
  it("product_launched for a new product id", () => {
    const events = diffCatalogs([product("1")], [product("1"), product("2", { title: "Barrier Repair Night Cream" })], {
      complete: true,
    });
    expect(events).toEqual([
      expect.objectContaining({
        type: "product_launched",
        productId: "2",
        payload: expect.objectContaining({ title: "Barrier Repair Night Cream", price: 4800 }),
      }),
    ]);
  });

  it("product_removed for a missing id — only from a complete catalog", () => {
    const prev = [product("1"), product("2")];
    expect(types(diffCatalogs(prev, [product("1")], { complete: true }))).toEqual(["product_removed"]);
    expect(diffCatalogs(prev, [product("1")], { complete: false })).toEqual([]);
  });

  it("price_changed with old/new and % change", () => {
    const events = diffCatalogs([product("1")], [product("1", { variants: [variant({ price: 4320 })] })], {
      complete: true,
    });
    expect(events).toEqual([
      expect.objectContaining({
        type: "price_changed",
        payload: expect.objectContaining({ oldPrice: 4800, newPrice: 4320, pctChange: -10, variants: 1 }),
      }),
    ]);
  });

  it("sale_started when compare-at goes above price (not also price_changed)", () => {
    const events = diffCatalogs(
      [product("1")],
      [product("1", { variants: [variant({ price: 3600, compareAtPrice: 4800 })] })],
      { complete: true },
    );
    expect(events).toEqual([
      expect.objectContaining({
        type: "sale_started",
        payload: expect.objectContaining({ salePrice: 3600, compareAtPrice: 4800, pctOff: 25 }),
      }),
    ]);
  });

  it("sale_ended when the compare-at price is removed (not also price_changed)", () => {
    const events = diffCatalogs(
      [product("1", { variants: [variant({ price: 3600, compareAtPrice: 4800 })] })],
      [product("1", { variants: [variant({ price: 4800, compareAtPrice: null })] })],
      { complete: true },
    );
    expect(types(events)).toEqual(["sale_ended"]);
    expect(events[0].payload).toMatchObject({ wasPrice: 3600, newPrice: 4800 });
  });

  it("sold_out when every variant becomes unavailable, restocked when one comes back", () => {
    const two = (a: boolean, b: boolean) =>
      product("1", { variants: [variant({ id: "s", available: a }), variant({ id: "m", available: b })] });
    expect(types(diffCatalogs([two(true, true)], [two(false, false)], { complete: true }))).toEqual(["sold_out"]);
    expect(types(diffCatalogs([two(false, false)], [two(false, true)], { complete: true }))).toEqual(["restocked"]);
  });

  it("sitewide_sale_detected when ≥30% of in-stock products newly go on sale", () => {
    const prev = Array.from({ length: 10 }, (_, i) => product(String(i)));
    const next = prev.map((p, i) =>
      i < 6 ? { ...p, variants: [variant({ price: 3600 + i * 100, compareAtPrice: 4800 })] } : p,
    );
    const events = diffCatalogs(prev, next, { complete: true });
    expect(types(events)).toEqual(["sitewide_sale_detected"]);
    expect(events[0].payload).toMatchObject({
      productsDiscounted: 6,
      inStockProducts: 10,
      shareDiscounted: 60,
      maxPctOff: 25,
    });
    expect((events[0].payload.examples as unknown[]).length).toBe(5);
  });
});

describe("diffCatalogs — low-noise rules", () => {
  it("emits nothing when nothing changed", () => {
    expect(diffCatalogs([product("1"), product("2")], [product("2"), product("1")], { complete: true })).toEqual([]);
  });

  it("one size selling out is not an event", () => {
    const prev = product("1", { variants: [variant({ id: "s" }), variant({ id: "m" })] });
    const next = product("1", { variants: [variant({ id: "s", available: false }), variant({ id: "m" })] });
    expect(diffCatalogs([prev], [next], { complete: true })).toEqual([]);
  });

  it("a multi-variant reprice is one event described by the biggest mover", () => {
    const prev = product("1", { variants: [variant({ id: "a", price: 1000 }), variant({ id: "b", price: 2000 })] });
    const next = product("1", { variants: [variant({ id: "a", price: 1100 }), variant({ id: "b", price: 1500 })] });
    const events = diffCatalogs([prev], [next], { complete: true });
    expect(events).toHaveLength(1);
    expect(events[0].payload).toMatchObject({ oldPrice: 2000, newPrice: 1500, pctChange: -25, variants: 2 });
  });

  it("skips variant events when either side has no variant data (untracked products)", () => {
    const tracked = product("1", { variants: [variant({ price: 4800 })] });
    const untracked = product("1", { variants: [] });
    expect(diffCatalogs([tracked], [untracked], { complete: true })).toEqual([]);
    expect(diffCatalogs([untracked], [tracked], { complete: true })).toEqual([]);
  });

  it("ignores variants that only exist on one side (new size added)", () => {
    const prev = product("1", { variants: [variant({ id: "s" })] });
    const next = product("1", { variants: [variant({ id: "s" }), variant({ id: "xl", price: 9900 })] });
    expect(diffCatalogs([prev], [next], { complete: true })).toEqual([]);
  });

  it("a few discounts in a big catalog stay individual sale_started events", () => {
    const prev = Array.from({ length: 20 }, (_, i) => product(String(i)));
    const next = prev.map((p, i) => (i < 2 ? { ...p, variants: [variant({ price: 3600, compareAtPrice: 4800 })] } : p));
    expect(types(diffCatalogs(prev, next, { complete: true }))).toEqual(["sale_started", "sale_started"]);
  });

  it("a tiny store discounting its one product is not 'sitewide'", () => {
    const prev = [product("1"), product("2")];
    const next = [{ ...prev[0], variants: [variant({ price: 3600, compareAtPrice: 4800 })] }, prev[1]];
    expect(types(diffCatalogs(prev, next, { complete: true }))).toEqual(["sale_started"]);
  });
});
