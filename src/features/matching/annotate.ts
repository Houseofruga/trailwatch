import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatalogEvent } from "@/features/catalog/diff";
import { downloadSnapshot } from "@/features/catalog/snapshots";
import type { CatalogProduct } from "@/features/catalog/types";
import type { ContextFor } from "@/features/events/record";
import type { NewEvent } from "@/features/events/types";
import { resolvePlan } from "@/features/plan/comp";
import { buildOwnIndex, headlinePrice, undercut } from "./match";

// Events about a specific competitor product that can be compared to yours.
const PRODUCT_EVENTS = new Set(["product_launched", "price_changed", "sale_started", "sale_ended", "sold_out", "restocked"]);
// Events that can newly put a competitor below your price.
const PRICE_MOVES = new Set(["product_launched", "price_changed", "sale_started"]);

export type OwnMatchContext = { ownMatch: { title: string; handle: string; price: number | null; score: number } };

/**
 * For one user (pure): match each product event to the user's own catalog and
 * flag new undercuts. Only the products that just changed are matched, so this
 * stays cheap on every check. Undercuts come only from the competitor's side
 * moving (launch below you, price cut, sale) — the move itself is the news.
 */
export function annotateForUser(
  userId: string,
  events: CatalogEvent[],
  competitorProducts: CatalogProduct[],
  ownCatalog: CatalogProduct[],
): { contexts: Map<number, OwnMatchContext>; undercuts: NewEvent[] } {
  const contexts = new Map<number, OwnMatchContext>();
  const undercuts: NewEvent[] = [];
  if (ownCatalog.length === 0) return { contexts, undercuts };

  const bestMatch = buildOwnIndex(ownCatalog);
  const byId = new Map(competitorProducts.map((p) => [p.id, p]));

  events.forEach((event, index) => {
    if (!event.productId || !PRODUCT_EVENTS.has(event.type)) return;
    const product = byId.get(event.productId);
    if (!product) return;
    const match = bestMatch(product);
    if (!match) return;

    contexts.set(index, {
      ownMatch: {
        title: match.product.title,
        handle: match.product.handle,
        price: headlinePrice(match.product),
        score: Math.round(match.score * 100) / 100,
      },
    });

    const cut = PRICE_MOVES.has(event.type) ? undercut(product, match.product, match.score) : null;
    if (cut) {
      undercuts.push({
        type: "price_undercut",
        severity: "high",
        source: "catalog",
        productId: product.id,
        storePageId: null,
        snapshotId: null,
        forUserId: userId,
        payload: {
          title: product.title,
          handle: product.handle,
          image: product.image,
          competitorPrice: cut.competitorPrice,
          ownTitle: match.product.title,
          ownHandle: match.product.handle,
          ownPrice: cut.ownPrice,
          pctBelow: cut.pctBelow,
          trigger: event.type,
        },
      });
    }
  });

  return { contexts, undercuts };
}

/**
 * Run annotateForUser for every follower of a store who has their own store on
 * a paid plan (own-store matching is a Pro feature). Returns the extra
 * per-user events and a contextFor for recordEvents. Best-effort: a missing
 * or unreadable own catalog just means no annotations for that user.
 */
export async function annotateFollowers(
  service: SupabaseClient,
  storeId: string,
  events: CatalogEvent[],
  competitorProducts: CatalogProduct[],
): Promise<{ undercuts: NewEvent[]; contextFor: ContextFor }> {
  const empty = { undercuts: [], contextFor: () => null };
  if (!events.some((e) => e.productId && PRODUCT_EVENTS.has(e.type))) return empty;

  const { data: followers } = await service
    .from("competitors")
    .select("user_id, users(email, plan, own_store_id)")
    .eq("store_id", storeId);
  const owners = (followers ?? []).flatMap((f) => {
    const u = (Array.isArray(f.users) ? f.users[0] : f.users) as
      | { email?: string; plan?: string; own_store_id?: string | null }
      | null;
    const plan = resolvePlan(u?.email, u?.plan === "paid" ? "paid" : "free");
    return u?.own_store_id && u.own_store_id !== storeId && plan !== "free"
      ? [{ userId: f.user_id as string, ownStoreId: u.own_store_id }]
      : [];
  });
  if (owners.length === 0) return empty;

  // Each own catalog is downloaded once, however many followers share it.
  const catalogs = new Map<string, CatalogProduct[]>();
  for (const ownStoreId of new Set(owners.map((o) => o.ownStoreId))) {
    const { data: store } = await service.from("stores").select("latest_snapshot_id").eq("id", ownStoreId).maybeSingle();
    if (!store?.latest_snapshot_id) continue;
    const { data: snap } = await service
      .from("catalog_snapshots")
      .select("storage_path")
      .eq("id", store.latest_snapshot_id)
      .single();
    const catalog = snap ? await downloadSnapshot(service, snap.storage_path) : null;
    if (catalog) catalogs.set(ownStoreId, catalog.products);
  }

  const perUser = new Map<string, Map<number, OwnMatchContext>>();
  const undercuts: NewEvent[] = [];
  for (const { userId, ownStoreId } of owners) {
    const own = catalogs.get(ownStoreId);
    if (!own) continue;
    const result = annotateForUser(userId, events, competitorProducts, own);
    perUser.set(userId, result.contexts);
    undercuts.push(...result.undercuts);
  }

  return {
    undercuts,
    contextFor: (userId, index) => perUser.get(userId)?.get(index) ?? null,
  };
}
