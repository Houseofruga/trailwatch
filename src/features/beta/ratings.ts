import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// One-click ratings from emails: "Was this useful?" on the Monday briefing,
// "Useful / Noise" on instant alerts. Each link is signed (same secret as the
// unsubscribe link) so it can't be forged for someone else.

export type RatingTarget = "briefing" | "alert";
export type RatingValue = "useful" | "not_useful";
export type RatingClaim = { userId: string; target: RatingTarget; id: string; value: RatingValue };

const secret = () => process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || null;
const payload = (c: RatingClaim) => `rate:${c.userId}:${c.target}:${c.id}:${c.value}`;

export function ratingToken(c: RatingClaim): string | null {
  const key = secret();
  return key ? createHmac("sha256", key).update(payload(c)).digest("base64url") : null;
}

export function verifyRating(c: RatingClaim, token: string): boolean {
  const want = ratingToken(c);
  if (!want) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The rating page link, or null when unsigned (no secret): callers then leave it out. */
export function ratingUrl(siteUrl: string, c: RatingClaim): string | null {
  const t = ratingToken(c);
  if (!t) return null;
  const q = new URLSearchParams({ u: c.userId, k: c.target, i: c.id, v: c.value, t });
  return `${siteUrl}/rate?${q}`;
}

/** Both links for one item. */
export function ratingUrls(siteUrl: string, userId: string, target: RatingTarget, id: string) {
  const useful = ratingUrl(siteUrl, { userId, target, id, value: "useful" });
  const notUseful = ratingUrl(siteUrl, { userId, target, id, value: "not_useful" });
  return useful && notUseful ? { useful, notUseful } : null;
}

export async function saveRating(service: SupabaseClient, c: RatingClaim, comment?: string): Promise<boolean> {
  const { error } = await service.from("ratings").upsert({
    user_id: c.userId,
    target_type: c.target,
    target_id: c.id,
    value: c.value,
    ...(comment !== undefined ? { comment: comment.slice(0, 2000) } : {}),
    updated_at: new Date().toISOString(),
  });
  return !error;
}
