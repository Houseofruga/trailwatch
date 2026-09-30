import type { SupabaseClient } from "@supabase/supabase-js";

// The daily cap on new accounts (SPEC.md §5 Phase 7) — keeps a spike of free
// signups from becoming a cost spike. The number lives in the database
// (app_settings.free_signups_per_day) because the database enforces it too;
// see migration 0015.

export const SIGNUP_CAP_MESSAGE = "Today's beta spots are gone. Try again tomorrow.";

const DEFAULT_CAP = 50;

/**
 * Accounts left today (UTC). Fails open (Infinity) if the setting can't be
 * read — e.g. before migration 0015 — so a lookup problem never locks out
 * signups; the database trigger remains the hard backstop.
 */
export async function signupsLeftToday(service: SupabaseClient): Promise<number> {
  const { data: setting, error } = await service
    .from("app_settings")
    .select("value")
    .eq("key", "free_signups_per_day")
    .maybeSingle();
  if (error) return Infinity;
  const cap = Number.parseInt(setting?.value ?? "", 10);
  const limit = Number.isFinite(cap) ? cap : DEFAULT_CAP;

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count, error: countError } = await service
    .from("users")
    .select("id", { count: "exact", head: true })
    .gte("created_at", dayStart.toISOString());
  if (countError) return Infinity;
  return Math.max(0, limit - (count ?? 0));
}
