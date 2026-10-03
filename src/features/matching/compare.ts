import type { CatalogProduct } from "@/features/catalog/types";
import type { PairRow } from "./candidates";
import { MATCHING_CONFIG } from "./config";
import { pricePosition } from "./units";

export type CheaperThanYours = { title: string; yourTitle: string; price: number; yourPrice: number };
export type CatalogComparison = { similar: number; cheaper: CheaperThanYours[] };

const withSize = (title: string, size: string | null) => (size ? `${title} (${size})` : title);

/**
 * A competitor's catalog against yours (first report, competitor overview),
 * from the user's active matches: how many of their products match one of
 * yours, and which are priced below it like for like, biggest gap first.
 */
export function compareMatched(
  competitor: CatalogProduct[],
  own: CatalogProduct[],
  matches: Map<string, PairRow>,
  cfg = MATCHING_CONFIG,
): CatalogComparison {
  const ownById = new Map(own.map((p) => [p.id, p]));
  let similar = 0;
  const cheaper: (CheaperThanYours & { gap: number })[] = [];
  for (const p of competitor) {
    const pair = matches.get(p.id);
    const mine = pair ? ownById.get(pair.ownProductId) : undefined;
    if (!mine) continue;
    similar += 1;
    const pos = pricePosition(p, mine, cfg);
    if (!pos || pos.pctBelow < cfg.pricePositionPct) continue;
    cheaper.push({
      title: withSize(p.title, pos.theirs.size),
      yourTitle: withSize(mine.title, pos.ours.size),
      price: pos.theirs.price,
      yourPrice: pos.ours.price,
      gap: pos.pctBelow,
    });
  }
  cheaper.sort((a, b) => b.gap - a.gap);
  return { similar, cheaper: cheaper.map((c) => ({ title: c.title, yourTitle: c.yourTitle, price: c.price, yourPrice: c.yourPrice })) };
}
