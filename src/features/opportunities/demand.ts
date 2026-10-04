import { OPPORTUNITIES_CONFIG as C } from "./config";

// B2: demand signals from what we already record (catalog events and the
// homepage's featured products). No new crawling. Pure.

export type StockEvent = { productId: string; type: "product_launched" | "sold_out" | "restocked"; detectedAt: string };

export type DemandSignal = {
  productId: string;
  // Sold-out → restocked cycles in the last 30 and 90 days.
  restocks30: number;
  restocks90: number;
  // Days from launch to selling out, when a recent launch sold out quickly.
  soldOutAfterDays: number | null;
};

const DAY = 86_400_000;

export function demandSignals(events: StockEvent[], now: number): DemandSignal[] {
  const byProduct = new Map<string, StockEvent[]>();
  for (const e of events) byProduct.set(e.productId, [...(byProduct.get(e.productId) ?? []), e]);
  const out: DemandSignal[] = [];
  for (const [productId, list] of byProduct) {
    const sorted = [...list].sort((a, b) => Date.parse(a.detectedAt) - Date.parse(b.detectedAt));
    let restocks30 = 0;
    let restocks90 = 0;
    let soldOut = false;
    for (const e of sorted) {
      const age = now - Date.parse(e.detectedAt);
      if (e.type === "sold_out") soldOut = true;
      // A restock counts as a cycle only after a sell-out we saw.
      if (e.type === "restocked" && soldOut) {
        soldOut = false;
        if (age <= C.demandWindowDays * DAY) restocks90 += 1;
        if (age <= 30 * DAY) restocks30 += 1;
      }
    }
    const launch = sorted.find((e) => e.type === "product_launched");
    const firstSoldOut = launch && sorted.find((e) => e.type === "sold_out" && Date.parse(e.detectedAt) >= Date.parse(launch.detectedAt));
    const days = launch && firstSoldOut ? (Date.parse(firstSoldOut.detectedAt) - Date.parse(launch.detectedAt)) / DAY : null;
    const recentLaunch = launch && now - Date.parse(launch.detectedAt) <= C.demandWindowDays * DAY;
    const soldOutAfterDays = recentLaunch && days !== null && days <= C.launchSoldOutDays ? Math.max(0, Math.round(days)) : null;
    if (restocks90 >= C.restockCycles || soldOutAfterDays !== null) out.push({ productId, restocks30, restocks90, soldOutAfterDays });
  }
  return out;
}

/** Days each product has been on the homepage, for those featured long enough. */
export function longFeatured(featuredSince: Record<string, string>, current: string[], now: number): Map<string, number> {
  const out = new Map<string, number>();
  for (const handle of current) {
    const since = Date.parse(featuredSince[handle] ?? "");
    if (!Number.isFinite(since)) continue;
    const days = Math.floor((now - since) / DAY);
    if (days >= C.featuredDays) out.set(handle, days);
  }
  return out;
}

/** The homepage's featured list with first-seen dates: kept for products still there, added for new ones. */
export function nextFeaturedSince(prev: Record<string, string>, current: string[], nowIso: string): Record<string, string> {
  return Object.fromEntries(current.map((h) => [h, prev[h] ?? nowIso]));
}
