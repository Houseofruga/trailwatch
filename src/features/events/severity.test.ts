import { describe, expect, it } from "vitest";
import { hasBestsellerTag, severityFor } from "./severity.config";
import { dedupeKey, type EventType } from "./types";

describe("severityFor", () => {
  it("routes the spec's high-severity events to instant", () => {
    const high: EventType[] = ["sitewide_sale_detected", "promo_launched", "product_launched"];
    for (const type of high) expect(severityFor({ type, payload: {} }), type).toBe("high");
  });

  it("sale_started is high from 20% off, normal below", () => {
    expect(severityFor({ type: "sale_started", payload: { pctOff: 20 } })).toBe("high");
    expect(severityFor({ type: "sale_started", payload: { pctOff: 35 } })).toBe("high");
    expect(severityFor({ type: "sale_started", payload: { pctOff: 19 } })).toBe("normal");
    expect(severityFor({ type: "sale_started", payload: {} })).toBe("normal");
  });

  it("sold_out is high only for a top product", () => {
    expect(severityFor({ type: "sold_out", payload: {}, isTopProduct: true })).toBe("high");
    expect(severityFor({ type: "sold_out", payload: {} })).toBe("normal");
  });

  it("routes the spec's normal events to the briefing", () => {
    const normal: EventType[] = [
      "price_changed",
      "restocked",
      "policy_change",
      "positioning_shift",
      "sale_ended",
      "product_removed",
    ];
    for (const type of normal) expect(severityFor({ type, payload: {} }), type).toBe("normal");
  });

  it("cosmetic is low (stored only)", () => {
    expect(severityFor({ type: "cosmetic", payload: {} })).toBe("low");
  });
});

describe("hasBestsellerTag", () => {
  it("matches best-seller tag variants, case-insensitively", () => {
    expect(hasBestsellerTag(["new", "Best-Seller"])).toBe(true);
    expect(hasBestsellerTag([" bestseller "])).toBe(true);
    expect(hasBestsellerTag(["sale", "summer"])).toBe(false);
    expect(hasBestsellerTag(["not-a-bestseller-ever"])).toBe(false);
  });
});

describe("dedupeKey", () => {
  it("keys on type + product, else page, else store", () => {
    expect(dedupeKey({ type: "sale_started", productId: "42", storePageId: null })).toBe("sale_started:42");
    expect(dedupeKey({ type: "promo_launched", productId: null, storePageId: "p1" })).toBe("promo_launched:p1");
    expect(dedupeKey({ type: "sitewide_sale_detected", productId: null, storePageId: null })).toBe(
      "sitewide_sale_detected:store",
    );
  });
});
