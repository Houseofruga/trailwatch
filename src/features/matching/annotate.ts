import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatalogEvent } from "@/features/catalog/diff";
import type { CatalogProduct } from "@/features/catalog/types";
import type { ContextFor } from "@/features/events/record";
import type { NewEvent } from "@/features/events/types";
import { activeMatches, type PairRow } from "./candidates";
import { MATCHING_CONFIG } from "./config";
import { loadOwnCatalogs, loadPairs, loadVerdicts, matchingOwners } from "./store";
import { headlinePrice, pricePosition, type PricePosition } from "./units";

// Events about a specific competitor product that can be compared to yours.
const PRODUCT_EVENTS = new Set(["product_launched", "price_changed", "sale_started", "sale_ended", "sold_out", "restocked"]);
// Events that can newly put a competitor below your price.
const PRICE_MOVES = new Set(["price_changed", "sale_started"]);

export type OwnMatchContext = {
  ownMatch: { title: string; handle: string; price: number | null; score: number | null; reason: string };
};

/**
 * A4: a price_position_change for one user, or null. Fires when their matched
 * product is now at least `pricePositionPct` below yours like for like, and
 * wasn't before (`previous` = the same product at the last check; omit it for
 * a launch). Only for active matches (the caller checks).
 */
export function positionEvent(
  userId: string,
  comp: CatalogProduct,
  own: CatalogProduct,
  pair: PairRow,
  trigger: string,
  previous?: CatalogProduct | null,
  cfg = MATCHING_CONFIG,
): NewEvent | null {
  const now = pricePosition(comp, own, cfg);
  if (!now || now.pctBelow < cfg.pricePositionPct) return null;
  const before = previous ? pricePosition(previous, own, cfg) : null;
  if (before && before.pctBelow >= cfg.pricePositionPct) return null; // already below: not news
  return {
    type: "price_position_change",
    severity: "high",
    source: "catalog",
    productId: comp.id,
    storePageId: null,
    snapshotId: null,
    forUserId: userId,
    payload: positionPayload(comp, own, now, pair, trigger),
  };
}

function positionPayload(comp: CatalogProduct, own: CatalogProduct, pos: PricePosition, pair: PairRow, trigger: string) {
  return {
    title: comp.title,
    handle: comp.handle,
    image: comp.image,
    competitorPrice: pos.theirs.price,
    competitorUnitPrice: Math.round(pos.theirs.unitPrice * 100) / 100,
    competitorSize: pos.theirs.size,
    ownTitle: own.title,
    ownHandle: own.handle,
    ownPrice: pos.ours.price,
    ownUnitPrice: Math.round(pos.ours.unitPrice * 100) / 100,
    ownSize: pos.ours.size,
    basis: pos.basis,
    unit: pos.unit,
    pctBelow: pos.pctBelow,
    confidence: pair.confidence,
    reason: pair.reason,
    trigger,
  };
}

/**
 * For one user (pure): tie each product event to their matched product (the
 * "vs your X" context) and flag price moves that put a match below their price.
 * `matches` = this user's active matches by competitor product id.
 */
export function annotateForUser(
  userId: string,
  events: CatalogEvent[],
  competitorProducts: CatalogProduct[],
  previousProducts: CatalogProduct[],
  ownCatalog: CatalogProduct[],
  matches: Map<string, PairRow>,
): { contexts: Map<number, OwnMatchContext>; positions: NewEvent[] } {
  const contexts = new Map<number, OwnMatchContext>();
  const positions: NewEvent[] = [];
  const byId = new Map(competitorProducts.map((p) => [p.id, p]));
  const prevById = new Map(previousProducts.map((p) => [p.id, p]));
  const ownById = new Map(ownCatalog.map((p) => [p.id, p]));

  events.forEach((event, index) => {
    if (!event.productId || !PRODUCT_EVENTS.has(event.type)) return;
    const product = byId.get(event.productId);
    const pair = matches.get(event.productId);
    const own = pair ? ownById.get(pair.ownProductId) : undefined;
    if (!product || !pair || !own) return;

    // Feed lines compare the event's price with this one, so only give it when
    // a plain price comparison is fair (one-size items), never Twin vs King.
    const fair = pricePosition(product, own)?.basis === "item";
    contexts.set(index, {
      ownMatch: {
        title: own.title,
        handle: own.handle,
        price: fair ? headlinePrice(own) : null,
        score: pair.confidence,
        reason: pair.reason,
      },
    });
    if (PRICE_MOVES.has(event.type)) {
      const e = positionEvent(userId, product, own, pair, event.type, prevById.get(product.id) ?? null);
      if (e) positions.push(e);
    }
  });
  return { contexts, positions };
}

/**
 * At each competitor check: run annotateForUser for every follower who has
 * their own store on a plan that includes matching. Uses the stored matches
 * (matching runs separately, see work.ts), so this costs no model call.
 */
export async function annotateFollowers(
  service: SupabaseClient,
  storeId: string,
  events: CatalogEvent[],
  competitorProducts: CatalogProduct[],
  previousProducts: CatalogProduct[],
): Promise<{ positions: NewEvent[]; contextFor: ContextFor }> {
  const empty = { positions: [], contextFor: () => null };
  const productIds = [...new Set(events.filter((e) => e.productId && PRODUCT_EVENTS.has(e.type)).map((e) => e.productId!))];
  if (productIds.length === 0) return empty;

  const owners = (await matchingOwners(service)).filter((o) => o.compStoreIds.includes(storeId) && o.ownStoreId !== storeId);
  if (owners.length === 0) return empty;
  const catalogs = await loadOwnCatalogs(service, [...new Set(owners.map((o) => o.ownStoreId))]);

  const perUser = new Map<string, Map<number, OwnMatchContext>>();
  const positions: NewEvent[] = [];
  for (const o of owners) {
    const own = catalogs.get(o.ownStoreId);
    if (!own) continue;
    // A sitewide sale can touch hundreds of products: past that, load them all
    // rather than build a too-long filter.
    const pairs = await loadPairs(service, o.ownStoreId, storeId, productIds.length <= 200 ? productIds : undefined);
    const verdicts = await loadVerdicts(service, o.userId, o.ownStoreId, storeId);
    const result = annotateForUser(o.userId, events, competitorProducts, previousProducts, own, activeMatches(pairs, verdicts));
    perUser.set(o.userId, result.contexts);
    positions.push(...result.positions);
  }
  return { positions, contextFor: (userId, index) => perUser.get(userId)?.get(index) ?? null };
}
