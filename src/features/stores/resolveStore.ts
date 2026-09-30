import { createServiceClient } from "@/lib/supabase/service";
import { canonicalStoreHost } from "./domain";
import type { Platform } from "./detectPlatform";
import { probeStore, storeInputError, type StoreProbeError } from "./probeStore";

export type StoreSummary = { id: string; domain: string; name: string; platform: Platform };

export type ResolveStoreResult =
  | { ok: true; store: StoreSummary; created: boolean }
  | StoreProbeError;

const STORE_COLUMNS = "id, domain, name, platform";

/**
 * Find the shared store for a domain, or probe and create it. Stores are global
 * (one per domain, SPEC.md §3), so a store someone already follows is reused
 * as-is — no second probe, no second crawl. Writes via the service role; the
 * caller is responsible for auth and plan limits.
 */
export async function resolveStore(input: string): Promise<ResolveStoreResult> {
  const inputError = storeInputError(input);
  if (inputError) return inputError;
  const host = canonicalStoreHost(input)!;

  const service = createServiceClient();
  const findExisting = () =>
    service.from("stores").select(STORE_COLUMNS).eq("domain", host).maybeSingle<StoreSummary>();

  const { data: existing, error: findError } = await findExisting();
  if (findError) throw findError;
  if (existing) return { ok: true, store: existing, created: false };

  const probe = await probeStore(host);
  if (!probe.ok) return probe;

  const { data: created, error: insertError } = await service
    .from("stores")
    .insert({
      domain: probe.host,
      name: probe.name,
      platform: probe.platform.platform,
      products_json_available: probe.platform.productsJsonAvailable,
      platform_evidence: probe.platform.evidence,
    })
    .select(STORE_COLUMNS)
    .single<StoreSummary>();

  if (insertError) {
    // Unique violation: someone else added the same store while we probed.
    // Theirs wins; use it.
    if (insertError.code === "23505") {
      const { data: raced } = await findExisting();
      if (raced) return { ok: true, store: raced, created: false };
    }
    throw insertError;
  }

  if (probe.pages.length > 0) {
    const { error: pagesError } = await service
      .from("store_pages")
      .insert(probe.pages.map((p) => ({ store_id: created.id, kind: p.kind, url: p.url })));
    if (pagesError) throw pagesError;
  }

  return { ok: true, store: created, created: true };
}
