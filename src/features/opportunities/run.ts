import type { SupabaseClient } from "@supabase/supabase-js";
import type { Classified } from "@/features/matching/candidates";
import { loadClasses, snapshotProducts } from "@/features/matching/store";
import type { ProductClass } from "@/features/matching/classify";
import { resolvePlan } from "@/features/plan/comp";
import { PLANS } from "@/features/plan/limits";
import { bestsellerSignals, type BestsellerSnapshot } from "./bestsellers";
import { buildOpportunities, mergeOpportunities, type CompetitorSignals, type Item } from "./build";
import { OPPORTUNITIES_CONFIG as C } from "./config";
import { demandSignals, longFeatured, type StockEvent } from "./demand";

// The daily refresh (cron tick): each eligible user's opportunities from data
// already collected — catalogs, product classes, Best Sellers reads, stock
// events, featured products. No fetching and no AI.

export type OpportunitiesTickResult = { users: number; opportunities: number; stopped?: string };

const DAY = 86_400_000;

// products: the classified ones (your store's side of a gap); signals carry every product.
type StoreData = { products: Classified[]; signals: Omit<CompetitorSignals, "storeName"> };

/** One store's data, loaded once per tick however many users follow it. */
async function loadStore(service: SupabaseClient, storeId: string, now: number): Promise<StoreData | null> {
  const { data: store } = await service
    .from("stores")
    .select("latest_snapshot_id, featured_handles, featured_since")
    .eq("id", storeId)
    .single();
  const catalog = await snapshotProducts(service, store?.latest_snapshot_id ?? null);
  if (!store || !catalog) return null;
  const classes = await loadClasses(service, storeId);
  const items: Item[] = catalog.map((p) => ({ product: p, cls: (classes.get(p.id) as ProductClass | undefined) ?? null }));
  const products = items.filter((c): c is Classified => c.cls !== null);

  const since = new Date(now - C.demandWindowDays * DAY).toISOString();
  const [{ data: reads }, { data: events }] = await Promise.all([
    service
      .from("bestseller_snapshots")
      .select("members, ranked_count, fetched_at")
      .eq("store_id", storeId)
      .gte("fetched_at", new Date(now - (C.climbWindowDays + 1) * DAY).toISOString())
      .order("fetched_at", { ascending: true }),
    service
      .from("events")
      .select("product_id, type, detected_at")
      .eq("store_id", storeId)
      .in("type", ["product_launched", "sold_out", "restocked"])
      .gte("detected_at", since)
      .not("product_id", "is", null)
      .limit(5000),
  ]);
  const snaps: BestsellerSnapshot[] = (reads ?? []).map((r) => ({ members: r.members, rankedCount: r.ranked_count, fetchedAt: r.fetched_at }));
  const latest = snaps.at(-1) ?? null;
  // Compared with the oldest read in the climb window (about a week ago).
  const earlier = snaps.length > 1 ? snaps[0] : null;
  const published = new Map(catalog.map((p) => [p.handle.toLowerCase(), p.publishedAt ?? p.createdAt]));
  const stock: StockEvent[] = (events ?? []).map((e) => ({ productId: e.product_id, type: e.type, detectedAt: e.detected_at }));

  return {
    products,
    signals: {
      storeId,
      products: items,
      bestsellers: latest,
      rising: latest ? bestsellerSignals(earlier, latest, published, now) : [],
      demand: demandSignals(stock, now),
      featured: longFeatured((store.featured_since ?? {}) as Record<string, string>, store.featured_handles ?? [], now),
    },
  };
}

export async function runOpportunitiesTick(service: SupabaseClient, budgetMs = C.tickBudgetMs): Promise<OpportunitiesTickResult> {
  const deadline = Date.now() + budgetMs;
  const now = Date.now();
  const result: OpportunitiesTickResult = { users: 0, opportunities: 0 };
  const stale = new Date(now - C.refreshEveryHours * 3_600_000).toISOString();
  const { data: users, error } = await service
    .from("users")
    .select("id, email, plan, own_store_id")
    .or(`opportunities_at.is.null,opportunities_at.lt.${stale}`)
    .order("opportunities_at", { ascending: true, nullsFirst: true })
    .limit(50);
  if (error) return { ...result, stopped: error.message };

  const stores = new Map<string, StoreData | null>();
  const storeData = async (id: string) => {
    if (!stores.has(id)) stores.set(id, await loadStore(service, id, now));
    return stores.get(id) ?? null;
  };

  for (const u of users ?? []) {
    if (Date.now() > deadline) return { ...result, stopped: "budget" };
    const done = () => service.from("users").update({ opportunities_at: new Date().toISOString() }).eq("id", u.id);
    if (!PLANS[resolvePlan(u.email, u.plan)].opportunities) {
      await done();
      continue;
    }
    const { data: follows } = await service.from("competitors").select("name, store_id").eq("user_id", u.id).not("store_id", "is", null);
    const competitors: CompetitorSignals[] = [];
    for (const f of follows ?? []) {
      if (f.store_id === u.own_store_id) continue;
      const d = await storeData(f.store_id);
      if (d) competitors.push({ ...d.signals, storeName: f.name });
    }
    const own = u.own_store_id ? ((await storeData(u.own_store_id))?.products ?? null) : null;
    const fresh = buildOpportunities(own?.length ? own : null, competitors, now);

    const { data: stored } = await service.from("opportunities").select("key, status, dismissed_score").eq("user_id", u.id);
    const { upsert, remove } = mergeOpportunities(
      fresh,
      (stored ?? []).map((s) => ({ key: s.key, status: s.status, dismissedScore: s.dismissed_score })),
    );
    if (upsert.length) {
      const { error: upErr } = await service.from("opportunities").upsert(
        upsert.map((o) => ({
          user_id: u.id,
          key: o.key,
          kind: o.kind,
          score: o.score,
          noticed: o.noticed,
          action: o.action,
          evidence: o.evidence,
          status: o.status,
          dismissed_score: o.dismissedScore,
          // Reopened by stronger evidence: no longer dismissed.
          ...(o.status === "open" ? { dismissed_at: null } : {}),
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "user_id,key" },
      );
      if (upErr) return { ...result, stopped: `Couldn't save opportunities: ${upErr.message}` };
    }
    if (remove.length) await service.from("opportunities").delete().eq("user_id", u.id).in("key", remove);
    await done();
    result.users += 1;
    result.opportunities += upsert.filter((o) => o.status === "open").length;
  }
  return result;
}
