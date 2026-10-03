import type { SupabaseClient } from "@supabase/supabase-js";
import { resolvePlan } from "@/features/plan/comp";
import { writeMeanings } from "./meaning";
import { deliveryFor } from "./routing";
import { dedupeKey, type NewEvent } from "./types";

const INSERT_CHUNK = 500;

// Per-user extras for a fan-out row, e.g. "comparable to your product X".
export type ContextFor = (userId: string, eventIndex: number) => Record<string, unknown> | null;

/**
 * Save a store's new events and fan them out to its followers (SPEC.md §5
 * Phase 3): events are global, generated once per store; each follower gets a
 * user_events row saying where it goes (instant alert or briefing) for their
 * plan. Low-severity events are stored but reach no one. An event with
 * `forUserId` (Phase 5's price_position_change — it's about one user's catalog) goes
 * only to that user. `contextFor` attaches per-user context to fan-out rows.
 * Service role only.
 */
export async function recordEvents(
  service: SupabaseClient,
  storeId: string,
  events: NewEvent[],
  contextFor?: ContextFor,
): Promise<number> {
  if (events.length === 0) return 0;

  // Inserted rows come back in insertion order, so index i ↔ events[i].
  const inserted: { id: string; severity: NewEvent["severity"]; forUserId: string | null }[] = [];
  for (let i = 0; i < events.length; i += INSERT_CHUNK) {
    const chunk = events.slice(i, i + INSERT_CHUNK);
    const rows = chunk.map((e) => ({
      store_id: storeId,
      type: e.type,
      severity: e.severity,
      source: e.source,
      product_id: e.productId,
      store_page_id: e.storePageId,
      payload: e.payload,
      snapshot_id: e.snapshotId,
      dedupe_key: dedupeKey(e),
      for_user_id: e.forUserId ?? null,
    }));
    const { data, error } = await service.from("events").insert(rows).select("id, severity");
    if (error) throw new Error(`Couldn't save events: ${error.message}`);
    (data ?? []).forEach((row, j) => inserted.push({ ...row, forUserId: chunk[j].forUserId ?? null }));
  }

  const { data: followers, error: followersError } = await service
    .from("competitors")
    .select("user_id, users(plan, email)")
    .eq("store_id", storeId);
  if (followersError) throw new Error(`Couldn't load followers: ${followersError.message}`);

  const fanOut = (followers ?? []).flatMap((f) => {
    // A to-one relation can come back as an object or a one-element array.
    const user = (Array.isArray(f.users) ? f.users[0] : f.users) as { plan?: string; email?: string } | null;
    const plan = resolvePlan(user?.email, user?.plan);
    return inserted.flatMap((e, index) => {
      if (e.forUserId && e.forUserId !== f.user_id) return [];
      const delivery = deliveryFor(e.severity, plan);
      if (!delivery) return [];
      const context = contextFor?.(f.user_id, index) ?? null;
      return [{ user_id: f.user_id, event_id: e.id, store_id: storeId, delivery, ...(context ? { context } : {}) }];
    });
  });

  for (let i = 0; i < fanOut.length; i += INSERT_CHUNK) {
    const { error } = await service.from("user_events").insert(fanOut.slice(i, i + INSERT_CHUNK));
    if (error) throw new Error(`Couldn't fan out events: ${error.message}`);
  }

  // "What it means" for the high-priority ones (best-effort, capped per store).
  await writeMeanings(
    service,
    storeId,
    inserted.flatMap((e, i) => (e.severity === "high" ? [{ id: e.id, type: events[i].type, payload: events[i].payload }] : [])),
  );
  return inserted.length;
}
