// Network layer for the checker: an SSRF-safe fetch that returns response
// headers + HTML, plus a sitemap <lastmod> lookup. Redirects are followed
// manually so every hop's host is re-validated against the SSRF guard.

import { lookup } from "node:dns/promises";
import * as cheerio from "cheerio";
import { isPrivateIp, validateUrlInput } from "./ssrf";

const USER_AGENT = "TrailwatchBot/1.0 (+https://trailwatch.houseofruga.com)";
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const MAX_BYTES = 2_000_000; // ~2 MB cap on the HTML we read

export type CheckFetch =
  | { ok: true; finalUrl: string; headers: Record<string, string>; html: string }
  | {
      ok: false;
      reason: "invalid-url" | "blocked" | "robots" | "fetch-error";
      message: string;
    };

/** Resolve a hostname and confirm every address it maps to is public. */
async function hostIsPublic(hostname: string): Promise<boolean> {
  try {
    const results = await lookup(hostname, { all: true });
    if (results.length === 0) return false;
    return results.every((r) => !isPrivateIp(r.address));
  } catch {
    return false; // DNS failure — don't fetch
  }
}

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

/** Fetch a URL following redirects manually, re-validating each hop. */
export async function safeFetch(rawUrl: string): Promise<CheckFetch> {
  const parsed = validateUrlInput(rawUrl);
  if (!parsed.ok) return { ok: false, reason: "invalid-url", message: parsed.reason };

  let current = parsed.url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await hostIsPublic(current.hostname))) {
      return {
        ok: false,
        reason: "blocked",
        message: "That address resolves to a private or unreachable host.",
      };
    }

    let res: Response;
    try {
      res = await fetch(current.toString(), {
        method: "GET",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,*/*" },
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      return {
        ok: false,
        reason: "fetch-error",
        message: err instanceof Error ? err.message : "Couldn't reach that page.",
      };
    }

    // Handle redirects ourselves so we can re-check the destination host.
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      try {
        current = new URL(location, current);
      } catch {
        return { ok: false, reason: "fetch-error", message: "Bad redirect target." };
      }
      if (current.protocol !== "http:" && current.protocol !== "https:") {
        return { ok: false, reason: "blocked", message: "Redirect to a non-web address." };
      }
      continue;
    }

    if (!res.ok) {
      return { ok: false, reason: "fetch-error", message: `The page returned HTTP ${res.status}.` };
    }

    const html = await readCapped(res);
    return { ok: true, finalUrl: current.toString(), headers: headersToRecord(res.headers), html };
  }

  return { ok: false, reason: "fetch-error", message: "Too many redirects." };
}

/** Read a response body up to MAX_BYTES, decoding as UTF-8. */
async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return res.text();

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  await reader.cancel().catch(() => {});
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c.subarray(0, Math.min(c.length, total - offset)), offset);
    offset += c.length;
  }
  return new TextDecoder("utf-8").decode(merged);
}

/**
 * Best-effort sitemap <lastmod> lookup for a specific URL. Only checks the
 * site's top-level /sitemap.xml (no sitemap-index recursion — a known MVP
 * limitation). Returns null on any miss.
 */
export async function sitemapLastmod(pageUrl: string): Promise<string | null> {
  let origin: string;
  try {
    origin = new URL(pageUrl).origin;
  } catch {
    return null;
  }
  if (!(await hostIsPublic(new URL(origin).hostname))) return null;

  let xml: string;
  try {
    const res = await fetch(`${origin}/sitemap.xml`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    xml = await res.text();
  } catch {
    return null;
  }

  const $ = cheerioLoadXml(xml);
  let found: string | null = null;
  const target = normalizeForCompare(pageUrl);
  $("url").each((_, el) => {
    if (found) return;
    const loc = $(el).find("loc").first().text().trim();
    if (loc && normalizeForCompare(loc) === target) {
      const lm = $(el).find("lastmod").first().text().trim();
      if (lm) found = lm;
    }
  });
  return found;
}

function normalizeForCompare(u: string): string {
  try {
    const url = new URL(u);
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return u.toLowerCase();
  }
}

function cheerioLoadXml(xml: string) {
  return cheerio.load(xml, { xmlMode: true });
}
