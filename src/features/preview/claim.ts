import type { SupabaseClient } from "@supabase/supabase-js";
import { addCompetitorByDomain } from "@/features/competitors/actions";
import { canonicalStoreHost } from "@/features/stores/domain";

// Widget prompt Part 3: after sign-up (or for a signed-in visitor), the
// previewed competitor becomes the account's competitor. Plan limits, the
// Shopify-only rule and duplicates are enforced by addCompetitorByDomain.

export type ClaimResult =
  | { ok: true; competitorId: string; firstCompetitor: boolean }
  | { ok: false; firstCompetitor: boolean; message: string };

const ID = /^[0-9a-f]{32}$/;

/** Pure: which domain to add — the preview's while it's valid, else the domain the visitor carried. */
export function claimDomain(
  preview: { domain: string; expires_at: string } | null,
  fallback: string | null,
  now = Date.now(),
): string | null {
  if (preview && Date.parse(preview.expires_at) > now) return preview.domain;
  return fallback ? canonicalStoreHost(fallback) : null;
}

export async function claimPreview(
  db: SupabaseClient,
  service: SupabaseClient,
  userId: string,
  previewId: string | null,
  fallbackDomain: string | null,
): Promise<ClaimResult> {
  const { count } = await db.from("competitors").select("id", { count: "exact", head: true }).not("store_id", "is", null);
  const firstCompetitor = (count ?? 0) === 0;

  const { data: preview } =
    previewId && ID.test(previewId)
      ? await service.from("previews").select("domain, expires_at, claimed_by").eq("id", previewId).maybeSingle()
      : { data: null };
  // Expired or unknown: fall back to the domain they looked up (a fresh read happens on add).
  const domain = claimDomain(preview, fallbackDomain);
  if (!domain) return { ok: false, firstCompetitor, message: "That preview has expired." };

  const added = await addCompetitorByDomain(domain);
  let competitorId = added.ok ? added.competitorId : null;
  if (!added.ok && added.code === "duplicate") {
    // Already following it (clicked twice, or an existing user): open that one.
    const { data: store } = await service.from("stores").select("id").eq("domain", domain).maybeSingle();
    const { data: existing } = store
      ? await db.from("competitors").select("id").eq("store_id", store.id).maybeSingle()
      : { data: null };
    competitorId = existing?.id ?? null;
  }
  if (!competitorId) return { ok: false, firstCompetitor, message: added.ok ? "" : added.message };

  if (preview && previewId && !preview.claimed_by) {
    await service.from("previews").update({ claimed_by: userId, claimed_at: new Date().toISOString() }).eq("id", previewId);
  }
  return { ok: true, competitorId, firstCompetitor };
}
