import type { EventType, Severity } from "./types";

// Severity decides delivery (SPEC.md §5 Phase 3): high → instant alert,
// normal → Monday briefing, low → stored only. Tune the rules here, not in the
// code that uses them.
export const SEVERITY_CONFIG = {
  // A single-product sale is "high" from this discount up.
  saleHighPctOff: 20,
  // Product tags that mark a best-seller (lowercased, compared exactly).
  bestsellerTags: ["bestseller", "best-seller", "best seller", "bestsellers", "top seller", "top-seller"],
};

// Types whose severity never depends on the details.
const FIXED: Partial<Record<EventType, Severity>> = {
  sitewide_sale_detected: "high",
  promo_launched: "high",
  price_position_change: "high",
  product_launched: "high",
  price_changed: "normal",
  restocked: "normal",
  policy_change: "normal",
  positioning_shift: "normal",
  // Not named in the spec; routed to the briefing as context, not news.
  sale_ended: "normal",
  product_removed: "normal",
  cosmetic: "low",
};

export type SeverityInput = {
  type: EventType;
  payload: Record<string, unknown>;
  // A "top product": featured on the store's homepage or tagged best-seller.
  // There's no sales data, so this is the honest proxy for "top".
  isTopProduct?: boolean;
};

export function severityFor({ type, payload, isTopProduct = false }: SeverityInput): Severity {
  if (type === "sale_started") {
    const pct = typeof payload.pctOff === "number" ? payload.pctOff : 0;
    return pct >= SEVERITY_CONFIG.saleHighPctOff ? "high" : "normal";
  }
  if (type === "sold_out") return isTopProduct ? "high" : "normal";
  return FIXED[type] ?? "normal";
}

export function hasBestsellerTag(tags: string[]): boolean {
  return tags.some((t) => SEVERITY_CONFIG.bestsellerTags.includes(t.trim().toLowerCase()));
}
