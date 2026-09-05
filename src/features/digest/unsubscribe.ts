import { createHmac, timingSafeEqual } from "node:crypto";

// One-click unsubscribe tokens. The digest email carries a link/List-Unsubscribe
// header with the user id + an HMAC of it, so a user can turn off the weekly
// digest without logging in — and the token can't be forged to unsubscribe
// someone else. Keyed by UNSUBSCRIBE_SECRET, falling back to CRON_SECRET so no
// new env is required (both are server-only; the HMAC output never reveals them).

function secret(): string | null {
  return process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || null;
}

/** Null when no secret is configured — callers then omit the one-click link. */
export function unsubscribeToken(userId: string): string | null {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key).update(userId).digest("base64url");
}

export function verifyUnsubscribe(userId: string, token: string): boolean {
  const expected = unsubscribeToken(userId);
  if (!expected) return false;
  const given = Buffer.from(token);
  const want = Buffer.from(expected);
  return given.length === want.length && timingSafeEqual(given, want);
}

/** The full one-click URL, or null when unsigned (no secret). */
export function unsubscribeUrl(siteUrl: string, userId: string): string | null {
  const token = unsubscribeToken(userId);
  if (!token) return null;
  return `${siteUrl}/api/unsubscribe?u=${encodeURIComponent(userId)}&t=${token}`;
}
