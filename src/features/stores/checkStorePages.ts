import type { SupabaseClient } from "@supabase/supabase-js";
import { extractMainText } from "@/features/checks/extract";
import { fetchPageIfAllowed } from "@/features/checks/fetchPage";
import { hashContent } from "@/features/checks/hash";
import { diffLines, isMeaningfulChange } from "@/features/checks/noiseFilter";
import { normalizeText } from "@/features/checks/normalize";
import { classifyPageChange } from "@/features/events/classifyPageChange";
import { recordEvents } from "@/features/events/record";
import { severityFor } from "@/features/events/severity.config";
import type { NewEvent } from "@/features/events/types";
import { featuredProductHandles } from "./discoverPages";

const EXCERPT_CAP = 1000;

export type StorePagesResult = { checked: number; changed: number; events: number; errors: number };

/**
 * Check a store's watched pages (homepage, sale page, policies) — SPEC.md §5
 * Phase 3. Per page: fetch (robots honored) → extract + normalize → hash.
 *   unchanged hash      → timestamp only, zero AI
 *   first capture       → baseline, zero AI
 *   noise-filter says trivial → new baseline, zero AI
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
      await service
        .from("stores")
        .update({ featured_handles: featuredProductHandles(fetched.html, new URL(page.url).origin) })
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

    totals.changed += 1;
    const result = await classifyPageChange({
      storeName: store?.name ?? "",
      pageKind: page.kind,
      oldText: page.content_text,
      newText: text,
    });
    if (result.ok) {
      const { type, ...details } = result.classification;
      const { added, removed } = diffLines(page.content_text, text);
      const payload = {
        ...details,
        pageKind: page.kind,
        url: page.url,
        excerptBefore: removed.join("\n").slice(0, EXCERPT_CAP),
        excerptAfter: added.join("\n").slice(0, EXCERPT_CAP),
      };
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

  return totals;
}
