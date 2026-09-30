import type { SupabaseClient } from "@supabase/supabase-js";
import { resolvePlan } from "@/features/plan/comp";
import { deliveryFor } from "./routing";
import { dedupeKey, type NewEvent } from "./types";

const INSERT_CHUNK = 500;

/**
 * Save a store's new events and fan them out to its followers (SPEC.md §5
 * Phase 3): events are global, generated once per store; each follower gets a
 * user_events row saying where it goes (instant alert or briefing) for their
 * plan. Low-severity events are stored but reach no one. Service role only.
 */
export async function recordEvents(service: SupabaseClient, storeId: string, events: NewEvent[]): Promise<number> {
  if (events.length === 0) return 0;

  const inserted: { id: string; severity: NewEvent["severity"] }[] = [];
  for (let i = 0; i < events.length; i += INSERT_CHUNK) {
    const rows = events.slice(i, i + INSERT_CHUNK).map((e) => ({
      store_id: storeId,
      type: e.type,
      severity: e.severity,
      source: e.source,
      product_id: e.productId,
      store_page_id: e.storePageId,
      payload: e.payload,
      snapshot_id: e.snapshotId,
      dedupe_key: dedupeKey(e),
    }));
    const { data, error } = await service.from("events").insert(rows).select("id, severity");
    if (error) throw new Error(`Couldn't save events: ${error.message}`);
    inserted.push(...(data ?? []));
  }

  const { data: followers, error: followersError } = await service
    .from("competitors")
    .select("user_id, users(plan, email)")
    .eq("store_id", storeId);
  if (followersError) throw new Error(`Couldn't load followers: ${followersError.message}`);

  const fanOut = (followers ?? []).flatMap((f) => {
    // A to-one relation can come back as an object or a one-element array.
    const user = (Array.isArray(f.users) ? f.users[0] : f.users) as { plan?: string; email?: string } | null;
    const plan = resolvePlan(user?.email, user?.plan === "paid" ? "paid" : "free");
    return inserted.flatMap((e) => {
      const delivery = deliveryFor(e.severity, plan);
      return delivery ? [{ user_id: f.user_id, event_id: e.id, store_id: storeId, delivery }] : [];
    });
  });

  for (let i = 0; i < fanOut.length; i += INSERT_CHUNK) {
    const { error } = await service.from("user_events").insert(fanOut.slice(i, i + INSERT_CHUNK));
    if (error) throw new Error(`Couldn't fan out events: ${error.message}`);
  }
  return inserted.length;
}
