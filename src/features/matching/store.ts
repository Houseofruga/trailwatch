import type { SupabaseClient } from "@supabase/supabase-js";
import { downloadSnapshot } from "@/features/catalog/snapshots";
import type { CatalogProduct } from "@/features/catalog/types";
import { resolvePlan } from "@/features/plan/comp";
import { PLANS } from "@/features/plan/limits";
import type { PairRow, Verdict } from "./candidates";
import type { ProductClass } from "./classify";
import type { Category, PackType } from "./taxonomy.config";

// Database reads and writes for matching. Service role unless noted.

const PAGE = 1000;

/** Every row of a query, past Supabase's 1,000-row page. */
export async function selectAll<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

export type Owner = { userId: string; ownStoreId: string; compStoreIds: string[] };

/** Users whose plan includes own-store matching, with their own store and followed stores. */
export async function matchingOwners(service: SupabaseClient): Promise<Owner[]> {
  const { data: users } = await service.from("users").select("id, email, plan, own_store_id").not("own_store_id", "is", null);
  const eligible = (users ?? []).filter((u) => PLANS[resolvePlan(u.email, u.plan)].ownStore);
  if (eligible.length === 0) return [];
  const { data: follows } = await service
    .from("competitors")
    .select("user_id, store_id")
    .in("user_id", eligible.map((u) => u.id))
    .not("store_id", "is", null);
  return eligible.map((u) => ({
    userId: u.id as string,
    ownStoreId: u.own_store_id as string,
    compStoreIds: (follows ?? []).filter((f) => f.user_id === u.id && f.store_id !== u.own_store_id).map((f) => f.store_id as string),
  }));
}

export async function snapshotProducts(service: SupabaseClient, snapshotId: string | null): Promise<CatalogProduct[] | null> {
  if (!snapshotId) return null;
  const { data: snap } = await service.from("catalog_snapshots").select("storage_path").eq("id", snapshotId).single();
  const catalog = snap ? await downloadSnapshot(service, snap.storage_path) : null;
  return catalog?.products ?? null;
}

/** Each own store's latest catalog, downloaded once however many owners share it. */
export async function loadOwnCatalogs(service: SupabaseClient, storeIds: string[]): Promise<Map<string, CatalogProduct[]>> {
  const out = new Map<string, CatalogProduct[]>();
  if (storeIds.length === 0) return out;
  const { data: stores } = await service.from("stores").select("id, latest_snapshot_id").in("id", storeIds);
  for (const s of stores ?? []) {
    const products = await snapshotProducts(service, s.latest_snapshot_id);
    if (products) out.set(s.id, products);
  }
  return out;
}

type ClassRow = {
  product_id: string;
  input_hash: string;
  category: string;
  subcategory: string;
  use: string;
  attributes: string[];
  pack_type: string;
};

export async function loadClasses(service: SupabaseClient, storeId: string): Promise<Map<string, ProductClass & { hash: string }>> {
  const rows = await selectAll<ClassRow>((from, to) =>
    service
      .from("product_classes")
      .select("product_id, input_hash, category, subcategory, use, attributes, pack_type")
      .eq("store_id", storeId)
      .range(from, to),
  );
  return new Map(
    rows.map((r) => [
      r.product_id,
      {
        hash: r.input_hash,
        category: r.category as Category,
        subcategory: r.subcategory,
        use: r.use,
        attributes: r.attributes,
        packType: r.pack_type as PackType,
      },
    ]),
  );
}

export async function saveClasses(
  service: SupabaseClient,
  storeId: string,
  rows: { productId: string; hash: string; cls: ProductClass }[],
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await service.from("product_classes").upsert(
    rows.map((r) => ({
      store_id: storeId,
      product_id: r.productId,
      input_hash: r.hash,
      category: r.cls.category,
      subcategory: r.cls.subcategory,
      use: r.cls.use,
      attributes: r.cls.attributes,
      pack_type: r.cls.packType,
      updated_at: new Date().toISOString(),
    })),
  );
  if (error) throw new Error(`Couldn't save product classes: ${error.message}`);
}

type MatchRow = { own_product_id: string; comp_product_id: string; pair_hash: string; confidence: number; reason: string };

/** Judged pairs for (own store, competitor store), optionally only for some competitor products. Works with a user client too (RLS). */
export async function loadPairs(
  db: SupabaseClient,
  ownStoreId: string,
  compStoreId: string,
  compProductIds?: string[],
): Promise<(PairRow & { pairHash: string })[]> {
  const rows = await selectAll<MatchRow>((from, to) => {
    let q = db
      .from("product_matches")
      .select("own_product_id, comp_product_id, pair_hash, confidence, reason")
      .eq("own_store_id", ownStoreId)
      .eq("comp_store_id", compStoreId);
    if (compProductIds) q = q.in("comp_product_id", compProductIds);
    return q.range(from, to);
  });
  return rows.map((r) => ({
    ownProductId: r.own_product_id,
    compProductId: r.comp_product_id,
    pairHash: r.pair_hash,
    confidence: r.confidence,
    reason: r.reason,
  }));
}

/** One user's verdicts on pairs between their store and one competitor, keyed own:comp. Works with a user client (RLS). */
export async function loadVerdicts(
  db: SupabaseClient,
  userId: string,
  ownStoreId: string,
  compStoreId: string,
): Promise<Map<string, Verdict>> {
  const { data } = await db
    .from("match_feedback")
    .select("own_product_id, comp_product_id, verdict")
    .eq("user_id", userId)
    .eq("own_store_id", ownStoreId)
    .eq("comp_store_id", compStoreId);
  return new Map((data ?? []).map((r) => [`${r.own_product_id}:${r.comp_product_id}`, r.verdict as Verdict]));
}
