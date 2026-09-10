// Shared client-side rules for the Add/Edit competitor page rows, so the takeover
// (CompetitorSetup) and the Edit-competitor dialog validate identically.

import { formatUrlError, domainMismatchError } from "./rowValidation";

export function toFullUrl(u: string): string {
  const t = u.trim();
  return t ? (/^https?:\/\//i.test(t) ? t : `https://${t}`) : "";
}

// Loose URL identity — protocol / www / trailing slash / case don't matter. Kept
// in sync with the server's canonicalUrl in actions.ts.
export function canonUrl(u: string): string {
  return u.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
}

export function hostname(u: string): string | null {
  try {
    return new URL(toFullUrl(u)).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * The per-row URL error, in the design's precedence (§4 C / §7 D): format →
 * account-wide duplicate → same-site domain. Duplicate wins over a domain
 * mismatch so a URL tracked elsewhere reads "Already tracked under X" even when
 * it's also on a foreign domain. `dupOwner` maps a canonical URL to the competitor
 * already tracking it. A `locked` row (an auto-filled homepage) skips the domain
 * check. Returns null for a blank row.
 */
export function rowUrlError(
  rawUrl: string,
  opts: { row0Full: string; locked: boolean; dupOwner: Map<string, string> },
): string | null {
  const full = toFullUrl(rawUrl);
  if (!full) return null;
  const fmt = formatUrlError(full);
  if (fmt) return fmt;
  const dup = opts.dupOwner.get(canonUrl(full));
  if (dup) return `Already tracked under ${dup}. URLs are unique across your whole account.`;
  const mismatch = opts.locked ? null : domainMismatchError(full, opts.row0Full || full);
  if (mismatch) return mismatch;
  return null;
}
