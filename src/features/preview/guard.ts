import { createHash } from "node:crypto";
import { PREVIEW_CONFIG } from "./config";

// Abuse and cost guardrails for anonymous previews (widget prompt Part 1).

export type IpVerdict = { ok: true } | { ok: false; reason: "per_ip_daily" | "per_ip_gap" };

/** Pure: may this IP look up another store now? `recent` = its lookups in the last day. */
export function ipVerdict(recent: Date[], now = new Date(), cfg = PREVIEW_CONFIG): IpVerdict {
  const dayAgo = now.getTime() - 24 * 60 * 60 * 1000;
  const lastDay = recent.filter((d) => d.getTime() > dayAgo);
  if (lastDay.some((d) => now.getTime() - d.getTime() < cfg.perIpGapSeconds * 1000)) return { ok: false, reason: "per_ip_gap" };
  if (lastDay.length >= cfg.perIpPerDay) return { ok: false, reason: "per_ip_daily" };
  return { ok: true };
}

/** Pure: is there room for another fresh (uncached) fetch today? */
export function underGlobalCap(freshToday: number, cfg = PREVIEW_CONFIG): boolean {
  return freshToday < cfg.freshPerDay;
}

/** Pure: is a snapshot read at `readAt` still fresh enough to reuse? */
export function isFresh(readAt: string | null | undefined, now = new Date(), cfg = PREVIEW_CONFIG): boolean {
  if (!readAt) return false;
  const t = Date.parse(readAt);
  return Number.isFinite(t) && now.getTime() - t < cfg.cacheHours * 60 * 60 * 1000;
}

/** IPs are never stored: only a salted hash, enough to count lookups. */
export function hashIp(ip: string): string {
  const salt = process.env.PREVIEW_IP_SALT ?? process.env.CRON_SECRET ?? "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/** An unguessable preview id (128 bits, URL-safe). */
export function newPreviewId(): string {
  return crypto.getRandomValues(new Uint8Array(16)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");
}
