"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { checkStoreIfDue } from "@/features/catalog/schedule";
import { resolvePlan } from "@/features/plan/comp";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { StoreProbeError } from "./probeStore";
import { resolveStore, type StoreSummary } from "./resolveStore";
import { PLANS } from "@/features/plan/limits";

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("plan, own_store_id").eq("id", user.id).single();
  return {
    user,
    plan: resolvePlan(user.email, profile?.plan),
    ownStoreId: (profile?.own_store_id as string | null) ?? null,
  };
}

export type OwnStoreView = {
  store: (StoreSummary & { productCount: number | null; lastCheckedAt: string | null }) | null;
  // Own-store matching (comparable products, undercut alerts) is a Pro feature.
  matchingEnabled: boolean;
};

/** The caller's own store, for the (pending-design) settings screen. */
export async function getOwnStore(): Promise<OwnStoreView> {
  const { plan, ownStoreId } = await currentUser();
  if (!ownStoreId) return { store: null, matchingEnabled: PLANS[plan].ownStore };
  const { data } = await createServiceClient()
    .from("stores")
    .select("id, domain, name, platform, catalog_stats, last_checked_at")
    .eq("id", ownStoreId)
    .maybeSingle();
  if (!data) return { store: null, matchingEnabled: PLANS[plan].ownStore };
  return {
    store: {
      id: data.id,
      domain: data.domain,
      name: data.name,
      platform: data.platform,
      productCount: (data.catalog_stats as { productCount?: number } | null)?.productCount ?? null,
      lastCheckedAt: data.last_checked_at,
    },
    matchingEnabled: PLANS[plan].ownStore,
  };
}

export type SetOwnStoreResult = { ok: true; store: StoreSummary } | StoreProbeError | { ok: false; code: "plan"; message: string };

/**
 * Set the caller's own store (SPEC.md §5 Phase 5). It's an ordinary shared
 * store — same probe, same crawler — linked from users.own_store_id; its
 * catalog is read right away so matching can start on the next competitor move.
 */
export async function setOwnStore(domain: string): Promise<SetOwnStoreResult> {
  const { user, plan } = await currentUser();
  if (!PLANS[plan].ownStore) {
    return { ok: false, code: "plan", message: "Matching your own products is on the Pro plan." };
  }

  const resolved = await resolveStore(domain);
  if (!resolved.ok) return resolved;

  // users is service-role-write only (migration 0004).
  const { error } = await createServiceClient()
    .from("users")
    .update({ own_store_id: resolved.store.id })
    .eq("id", user.id);
  if (error) throw new Error(`Couldn't save your store: ${error.message}`);

  after(async () => {
    try {
      await checkStoreIfDue(resolved.store.id);
    } catch (err) {
      console.error(`First read of own store ${resolved.store.id} failed:`, err);
    }
  });

  revalidatePath("/settings");
  return { ok: true, store: resolved.store };
}
