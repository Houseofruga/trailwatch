import type { CatalogEventType } from "@/features/catalog/diff";

// Page-change classes (SPEC.md §5 Phase 3). `cosmetic` is kept as a low-severity
// event — stored for the record, never shown or sent.
export type PageEventType = "promo_launched" | "positioning_shift" | "policy_change" | "cosmetic";

// price_undercut (Phase 5): a competitor's comparable product priced below the
// user's own — per user, since it depends on their catalog.
export type EventType = CatalogEventType | PageEventType | "price_undercut";

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
  // Set for events about one user's own catalog (price_undercut); they're
  // fanned out only to that user.
  forUserId?: string | null;
};

/** Identifies "the same news" for dedupe: one product's sale, one page's promo. */
export function dedupeKey(e: Pick<NewEvent, "type" | "productId" | "storePageId">): string {
  return `${e.type}:${e.productId ?? e.storePageId ?? "store"}`;
}
