import { BETA_CONFIG } from "@/features/beta/config";
import { createServiceClient } from "@/lib/supabase/service";

// The live "spots left" line only shows once a few spots are taken: an empty
// counter reads as "nobody has joined", which is true but unhelpful.
const SHOW_FROM = 5;

/** Spots left out of the cap, or null while the count stays hidden (or can't be read). */
export async function betaSpotsLeft(): Promise<number | null> {
  try {
    const { count, error } = await createServiceClient()
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("is_founding_member", true);
    if (error || count === null || count < SHOW_FROM) return null;
    return Math.max(0, BETA_CONFIG.foundingCap - count);
  } catch {
    return null;
  }
}

const BLACK_FRIDAY = Date.UTC(2026, 10, 27);
const WEEK = 7 * 24 * 60 * 60 * 1000;

/** Whole weeks from now until Black Friday 2026 (can be zero or negative). */
export const weeksToBlackFriday = (): number => Math.floor((BLACK_FRIDAY - Date.now()) / WEEK);
