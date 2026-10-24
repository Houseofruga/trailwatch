import { CATALOG_CONFIG } from "./config";
import type { CatalogEvent } from "./diff";

/** A sell-out or restock already reported for one of the store's products. */
export type StockHistory = { productId: string; type: "sold_out" | "restocked"; at: string };

const HOUR_MS = 60 * 60 * 1000;

/**
 * Drops stock moves that are flip-flops, not news. Pure: the caller passes the
 * store's recently reported sell-outs and restocks.
 *  - A sell-out is reported at most once per product in `soldOutRepeatDays`.
 *  - A restock is reported only when the last reported stock move for the
 *    product is a sell-out that lasted at least `restockMinOutHours`. A product
 *    back within a day or two was a blip; one never reported as sold out
 *    (its sell-out was a repeat) isn't news coming back either. A product with
 *    no recent history is reported: it may have been out for a long time.
 */
export function quietStockFlips(events: CatalogEvent[], history: StockHistory[], now: Date, cfg = CATALOG_CONFIG): CatalogEvent[] {
  const latest = new Map<string, StockHistory>();
  const lastSoldOut = new Map<string, number>();
  for (const h of history) {
    const at = Date.parse(h.at);
    const prev = latest.get(h.productId);
    if (!prev || at > Date.parse(prev.at)) latest.set(h.productId, h);
    if (h.type === "sold_out" && at > (lastSoldOut.get(h.productId) ?? 0)) lastSoldOut.set(h.productId, at);
  }
  const nowMs = now.getTime();
  return events.filter((e) => {
    if (!e.productId) return true;
    if (e.type === "sold_out") {
      const last = lastSoldOut.get(e.productId);
      return last === undefined || nowMs - last >= cfg.soldOutRepeatDays * 24 * HOUR_MS;
    }
    if (e.type === "restocked") {
      const last = latest.get(e.productId);
      if (!last) return true;
      return last.type === "sold_out" && nowMs - Date.parse(last.at) >= cfg.restockMinOutHours * HOUR_MS;
    }
    return true;
  });
}
