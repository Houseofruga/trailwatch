import type { SupabaseClient } from "@supabase/supabase-js";
import { extractMainText } from "@/features/checks/extract";
import { fetchPageIfAllowed } from "@/features/checks/fetchPage";
import { hashContent } from "@/features/checks/hash";
import { diffLines, isMeaningfulChange, versionsSeen } from "@/features/checks/noiseFilter";
import { normalizeText } from "@/features/checks/normalize";
import { classifyPageChange } from "@/features/events/classifyPageChange";
import { recordEvents } from "@/features/events/record";
import { severityFor } from "@/features/events/severity.config";
import type { NewEvent } from "@/features/events/types";
import { aiCallsToday, recordAiUsage, recordFetches, USAGE_CONFIG } from "@/features/usage/record";
import { nextFeaturedSince } from "@/features/opportunities/demand";
import { featuredProductHandles } from "./discoverPages";

const EXCERPT_CAP = 1000;
// A page switching back to a version seen in its change events this recently is
// toggling, not changing (see versionsSeen).
const TOGGLE_LOOKBACK_DAYS = 14;

export type StorePagesResult = { checked: number; changed: number; events: number; errors: number };

/**
 * Check a store's watched pages (homepage, sale page, policies) — SPEC.md §5
 * Phase 3. Per page: fetch (robots honored) → extract + normalize → hash.
 *   unchanged hash      → timestamp only, zero AI
 *   first capture       → baseline, zero AI
 *   noise-filter says trivial → new baseline, zero AI
 *   back to a recent version  → new baseline, zero AI (the page is toggling)
 *   meaningful          → one Haiku call to classify → event
 * The homepage also refreshes the store's featured products (top-product signal).
 * One page failing doesn't stop the others.
 */
export async function checkStorePages(service: SupabaseClient, storeId: string): Promise<StorePagesResult> {
  const { data: store } = await service.from("stores").select("name").eq("id", storeId).single();
  const { data: pages, error } = await service
    .from("store_pages")
    .select("id, kind, url, content_hash, content_text")
    .eq("store_id", storeId);
  if (error) throw new Error(`Couldn't load store pages: ${error.message}`);

  const totals: StorePagesResult = { checked: 0, changed: 0, events: 0, errors: 0 };
  // Phase 7 cap: AI classifications this store may still use today.
  let aiBudget = USAGE_CONFIG.maxAiCallsPerStorePerDay - (await aiCallsToday(service, storeId, "classify"));

  for (const page of pages ?? []) {
    totals.checked += 1;
    const update = (fields: Record<string, unknown>) =>
      service
        .from("store_pages")
        .update({ last_checked_at: new Date().toISOString(), ...fields })
        .eq("id", page.id);

    const fetched = await fetchPageIfAllowed(page.url);
    if (!fetched.ok) {
      totals.errors += 1;
      await update({ check_status: fetched.reason === "robots" ? "blocked" : "error", check_error: fetched.message });
      continue;
    }

    if (page.kind === "homepage") {
      const featured = featuredProductHandles(fetched.html, new URL(page.url).origin);
      const { data: prev } = await service.from("stores").select("featured_since").eq("id", storeId).single();
      await service
        .from("stores")
        .update({
          featured_handles: featured,
          // How long each stays featured (Opportunities B2).
          featured_since: nextFeaturedSince((prev?.featured_since ?? {}) as Record<string, string>, featured, new Date().toISOString()),
        })
        .eq("id", storeId);
    }

    const text = normalizeText(extractMainText(fetched.html));
    const hash = hashContent(text);
    const ok = { check_status: "ok", check_error: null };

    if (hash === page.content_hash) {
      await update(ok);
      continue;
    }
    const baseline = { ...ok, content_hash: hash, content_text: text };
    if (!page.content_text) {
      await update(baseline);
      continue;
    }
    if (!isMeaningfulChange(page.content_text, text).meaningful) {
      await update(baseline);
      continue;
    }
    if ((await recentVersions(service, page.id)).has(hash)) {
      await update(baseline);
      continue;
    }

    totals.changed += 1;
    if (aiBudget <= 0) {
      // Over today's AI cap: leave the old baseline in place so this change is
      // classified on a later check instead of being dropped.
      console.warn(`AI cap reached for store ${storeId}; deferring ${page.url}`);
      await update(ok);
      continue;
    }
    aiBudget -= 1;
    const result = await classifyPageChange({
      storeName: store?.name ?? "",
      pageKind: page.kind,
      oldText: page.content_text,
      newText: text,
    });
    if (result.call) {
      await recordAiUsage(service, [{ feature: "classify", storeId, ...result.call }]);
    }
    if (result.ok) {
      const { type, ...details } = result.classification;
      const { added, removed } = diffLines(page.content_text, text);
      const payload = {
        ...details,
        pageKind: page.kind,
        url: page.url,
        // The versions this change went between, so a later switch back is recognised.
        contentHash: hash,
        previousHash: page.content_hash,
        excerptBefore: removed.join("\n").slice(0, EXCERPT_CAP),
        excerptAfter: added.join("\n").slice(0, EXCERPT_CAP),
      };
      // The same promo code shown on the homepage and the sale page is one promotion.
      if (type === "promo_launched" && details.code && (await promoAlreadySeen(service, storeId, details.code))) {
        await update(baseline);
        continue;
      }
      // Saved before the baseline moves: if this throws, the page still holds
      // the old text and the next check re-detects the change.
      const event: NewEvent = {
        type,
        severity: severityFor({ type, payload }),
        source: "page",
        productId: null,
        storePageId: page.id,
        payload,
        snapshotId: null,
      };
      totals.events += await recordEvents(service, storeId, [event]);
    } else {
      // No classifier (or it failed): record nothing rather than guess. The
      // baseline still moves, so a real change isn't re-classified forever.
      console.warn(`Page change not classified (${page.url}): ${result.reason}`);
    }
    await update(baseline);
  }

  await recordFetches(service, storeId, "page", totals.checked);
  return totals;
}

/** Versions this page went between in its recent change events (any severity). */
async function recentVersions(service: SupabaseClient, pageId: string): Promise<Set<string>> {
  const since = new Date(Date.now() - TOGGLE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await service
    .from("events")
    .select("contentHash:payload->>contentHash, previousHash:payload->>previousHash")
    .eq("store_page_id", pageId)
    .gte("detected_at", since)
    .limit(500);
  return versionsSeen((data ?? []) as Record<string, unknown>[]);
}

/** Whether this store's promo with this code was already reported in the last week (from any page). */
async function promoAlreadySeen(service: SupabaseClient, storeId: string, code: string): Promise<boolean> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await service
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("type", "promo_launched")
    .ilike("payload->>code", code)
    .gte("detected_at", since);
  return (count ?? 0) > 0;
}
