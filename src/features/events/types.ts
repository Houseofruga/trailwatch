import type { CatalogEventType } from "@/features/catalog/diff";

// Page-change classes (SPEC.md §5 Phase 3). `cosmetic` is kept as a low-severity
// event — stored for the record, never shown or sent.
export type PageEventType = "promo_launched" | "positioning_shift" | "policy_change" | "cosmetic";

export type EventType = CatalogEventType | PageEventType;

export type Severity = "high" | "normal" | "low";

/** An event ready to insert: catalog and page events share one table. */
export type NewEvent = {
  type: EventType;
  severity: Severity;
  source: "catalog" | "page";
  productId: string | null;
  storePageId: string | null;
  payload: Record<string, unknown>;
  snapshotId: string | null;
};

/** Identifies "the same news" for dedupe: one product's sale, one page's promo. */
export function dedupeKey(e: Pick<NewEvent, "type" | "productId" | "storePageId">): string {
  return `${e.type}:${e.productId ?? e.storePageId ?? "store"}`;
}
