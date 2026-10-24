import { describe, expect, it } from "vitest";
import type { CatalogEvent } from "./diff";
import { quietStockFlips, type StockHistory } from "./stockNoise";

const now = new Date("2026-10-16T16:00:00Z");
const ev = (type: "sold_out" | "restocked", productId = "p1"): CatalogEvent => ({ type, productId, payload: { title: productId } });
const h = (type: StockHistory["type"], at: string, productId = "p1"): StockHistory => ({ productId, type, at });
const kept = (e: CatalogEvent, history: StockHistory[]) => quietStockFlips([e], history, now).length === 1;

describe("quietStockFlips", () => {
  it("reports a first sell-out, and a sell-out more than a week after the last one", () => {
    expect(kept(ev("sold_out"), [])).toBe(true);
    expect(kept(ev("sold_out"), [h("sold_out", "2026-10-08T12:00:00Z"), h("restocked", "2026-10-11T12:00:00Z")])).toBe(true);
  });

  it("drops a repeat sell-out within the week", () => {
    expect(kept(ev("sold_out"), [h("sold_out", "2026-10-12T21:00:00Z"), h("restocked", "2026-10-16T01:00:00Z")])).toBe(false);
  });

  it("drops a restock after a short blip, reports one after a real sell-out", () => {
    expect(kept(ev("restocked"), [h("sold_out", "2026-10-15T21:00:00Z")])).toBe(false);
    expect(kept(ev("restocked"), [h("sold_out", "2026-10-12T21:00:00Z")])).toBe(true);
  });

  it("drops a restock when the user was never told it sold out (the sell-out was a repeat)", () => {
    expect(kept(ev("restocked"), [h("sold_out", "2026-10-10T00:00:00Z"), h("restocked", "2026-10-13T00:00:00Z")])).toBe(false);
  });

  it("reports a restock with no recent history, and leaves other products and events alone", () => {
    expect(kept(ev("restocked"), [])).toBe(true);
    expect(kept(ev("sold_out", "p2"), [h("sold_out", "2026-10-15T00:00:00Z", "p1")])).toBe(true);
    const launch: CatalogEvent = { type: "product_launched", productId: "p1", payload: {} };
    expect(quietStockFlips([launch], [h("sold_out", "2026-10-15T00:00:00Z")], now)).toEqual([launch]);
  });

  it("turns one product's flip-flopping week into a sell-out and one real restock", () => {
    // Percale Sham Set (Evergreen), week of 2026-10-12, as seen in production.
    const history: StockHistory[] = [];
    const reported: string[] = [];
    for (const [type, at] of [
      ["sold_out", "2026-10-12T21:00:00Z"],
      ["restocked", "2026-10-14T01:00:00Z"],
      ["sold_out", "2026-10-14T06:00:00Z"],
      ["restocked", "2026-10-16T01:00:00Z"],
      ["sold_out", "2026-10-16T16:00:00Z"],
    ] as const) {
      if (quietStockFlips([ev(type)], history, new Date(at)).length) {
        history.push(h(type, at));
        reported.push(`${type}@${at.slice(5, 10)}`);
      }
    }
    expect(reported).toEqual(["sold_out@10-12", "restocked@10-16"]);
  });
});
