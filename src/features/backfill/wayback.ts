import { safeFetch } from "@/features/lastUpdated/fetch";
import { extractMainText } from "@/features/checks/extract";
import { normalizeText } from "@/features/checks/normalize";
import { hashContent } from "@/features/checks/hash";

// Internet Archive access for the historical backfill. The CDX API lists a
// page's captures (metadata only); the raw endpoint returns one capture's
// original HTML. Both go through the checker's hardened safeFetch (SSRF-safe,
// public hosts only, timeout + body cap) — archive.org is public, so this is
// just fetching public pages, same as the live check.

const CDX_ENDPOINT = "https://web.archive.org/cdx/search/cdx";
// The "last notable change" lookback window. 6 months keeps the search recent and
// bounds fetch cost, and it's the number the dashboard reports ("No notable change
// in the last 180 days"). Keep this in sync with the copy in the dashboard.
const HISTORY_MONTHS = 6;

export type Capture = { timestamp: string; date: string /* ISO */ };

/** A 14-digit CDX timestamp (YYYYMMDDhhmmss) → ISO date, or null if malformed. */
export function cdxTimestampToIso(ts: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(ts);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

/**
 * Parse the CDX JSON body (an array of rows; the first row is the column header)
 * into de-duplicated captures, oldest→newest, and return the most recent `cap`.
 * The API already collapses consecutive identical digests, so each remaining row
 * is a real content change. Pure + total: bad/empty input yields [].
 */
export function parseCaptures(body: string, cap: number): Capture[] {
  let rows: unknown;
  try {
    rows = JSON.parse(body);
  } catch {
    return [];
  }
  if (!Array.isArray(rows) || rows.length < 2) return [];

  const header = rows[0] as unknown[];
  const tsCol = header.indexOf("timestamp");
  if (tsCol < 0) return [];

  const seen = new Set<string>();
  const captures: Capture[] = [];
  for (const row of rows.slice(1)) {
    if (!Array.isArray(row)) continue;
    const ts = String(row[tsCol] ?? "");
    if (seen.has(ts)) continue;
    const date = cdxTimestampToIso(ts);
    if (!date) continue;
    seen.add(ts);
    captures.push({ timestamp: ts, date });
  }

  captures.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  // Most recent `cap` captures, kept in chronological order for consecutive diffs.
  return captures.slice(Math.max(0, captures.length - cap));
}

function monthsAgoStamp(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  // CDX `from` accepts a YYYYMMDD prefix.
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/** List up to `cap` recent distinct-content captures for a URL (metadata only). */
export async function listCaptures(url: string, cap: number): Promise<Capture[]> {
  const params = new URLSearchParams({
    url,
    output: "json",
    fl: "timestamp,digest,statuscode",
    filter: "statuscode:200",
    collapse: "digest",
    from: monthsAgoStamp(HISTORY_MONTHS),
    limit: "40",
  });
  // The CDX API is often slow (multi-second); give it more room than the default
  // 10s so a real capture list isn't lost to a timeout.
  const res = await safeFetch(`${CDX_ENDPOINT}?${params.toString()}`, {
    maxBytes: 512_000,
    timeoutMs: 25_000,
  });
  if (!res.ok) return [];
  return parseCaptures(res.html, cap);
}

/**
 * The date the page's content last changed per the archive — the newest
 * distinct-content capture. Returns `ok:false` when the CDX request itself failed
 * (timeout, rate-limit, network) so the caller can retry later instead of caching
 * a wrong "no history"; `ok:true` with `iso:null` means the archive genuinely has
 * no captures for this URL.
 */
export async function latestCaptureDate(url: string): Promise<{ ok: boolean; iso: string | null }> {
  const params = new URLSearchParams({
    url,
    output: "json",
    fl: "timestamp,digest,statuscode",
    filter: "statuscode:200",
    collapse: "digest",
    from: monthsAgoStamp(HISTORY_MONTHS),
    limit: "40",
  });
  const res = await safeFetch(`${CDX_ENDPOINT}?${params.toString()}`, {
    maxBytes: 512_000,
    timeoutMs: 25_000,
  });
  if (!res.ok) return { ok: false, iso: null };
  return { ok: true, iso: parseCaptures(res.html, 1).at(-1)?.date ?? null };
}

/**
 * Fetch one capture's original HTML (the `id_` suffix returns the raw page with
 * no Wayback banner/rewriting) and reduce it to comparable normalized text +
 * hash, exactly as the live check does. Null on any fetch/parse failure so a
 * single bad capture just drops out of the timeline.
 */
export async function fetchArchivedText(
  capture: Capture,
  url: string,
): Promise<{ text: string; hash: string } | null> {
  const archiveUrl = `https://web.archive.org/web/${capture.timestamp}id_/${url}`;
  const res = await safeFetch(archiveUrl);
  if (!res.ok) return null;
  const text = normalizeText(extractMainText(res.html));
  if (!text.trim()) return null;
  return { text, hash: hashContent(text) };
}
