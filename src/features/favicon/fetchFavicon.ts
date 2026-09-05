// Resolve and fetch a competitor's own favicon, server-side and SSRF-safe, so
// the browser never discloses which competitors a user tracks to a third-party
// icon service. Reuses the same guards as the rest of the app: validateUrlInput
// + a DNS/private-IP check on every hop, manual redirects, and a byte cap.

import { lookup } from "node:dns/promises";
import * as cheerio from "cheerio";
import { safeFetch } from "@/features/lastUpdated/fetch";
import { isPrivateIp, validateUrlInput } from "@/features/lastUpdated/ssrf";

const USER_AGENT = "TrailwatchBot/1.0 (+https://gettrailwatch.com)";
const TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
const MAX_ICON_BYTES = 512_000; // 512 KB is plenty for any favicon

export type Favicon = { bytes: Uint8Array; contentType: string };

async function hostIsPublic(hostname: string): Promise<boolean> {
  try {
    const results = await lookup(hostname, { all: true });
    return results.length > 0 && results.every((r) => !isPrivateIp(r.address));
  } catch {
    return false; // DNS failure — don't fetch
  }
}

async function readCappedBytes(res: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array(await res.arrayBuffer());

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  await reader.cancel().catch(() => {});

  const size = Math.min(total, maxBytes);
  const merged = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    if (offset >= size) break;
    const slice = c.subarray(0, size - offset);
    merged.set(slice, offset);
    offset += slice.length;
  }
  return merged;
}

function typeFromPath(pathname: string): string {
  if (/\.svg$/i.test(pathname)) return "image/svg+xml";
  if (/\.png$/i.test(pathname)) return "image/png";
  if (/\.gif$/i.test(pathname)) return "image/gif";
  if (/\.jpe?g$/i.test(pathname)) return "image/jpeg";
  if (/\.webp$/i.test(pathname)) return "image/webp";
  return "image/x-icon";
}

/** SSRF-safe binary GET for an image, re-validating each redirect hop. */
async function fetchImage(rawUrl: string): Promise<Favicon | null> {
  const parsed = validateUrlInput(rawUrl);
  if (!parsed.ok) return null;

  let current = parsed.url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await hostIsPublic(current.hostname))) return null;

    let res: Response;
    try {
      res = await fetch(current.toString(), {
        headers: { "User-Agent": USER_AGENT, Accept: "image/*,*/*;q=0.8" },
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return null;
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return null;
      try {
        current = new URL(location, current);
      } catch {
        return null;
      }
      if (current.protocol !== "http:" && current.protocol !== "https:") return null;
      continue;
    }

    if (!res.ok) return null;

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const looksLikeIcon = /\.(ico|png|svg|gif|jpe?g|webp)(\?|$)/i.test(current.pathname);
    // Accept only images (some servers mislabel .ico as octet-stream — allow those by extension).
    if (!contentType.startsWith("image/") && !looksLikeIcon) return null;

    const bytes = await readCappedBytes(res, MAX_ICON_BYTES);
    if (bytes.length === 0) return null;

    return {
      bytes,
      contentType: contentType.startsWith("image/") ? contentType : typeFromPath(current.pathname),
    };
  }
  return null;
}

/** Icon <link>s declared in a homepage, best (apple-touch / largest / SVG) first. */
function iconHrefsFromHtml(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const scored: { href: string; score: number }[] = [];

  $(
    'link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]',
  ).each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const rel = ($(el).attr("rel") || "").toLowerCase();
    const dim = parseInt(($(el).attr("sizes") || "").split("x")[0], 10);
    let score = Number.isFinite(dim) ? dim : 0;
    if (rel.includes("apple-touch")) score += 200; // usually crisp, square
    if (/\.svg(\?|$)/i.test(href)) score += 150; // scalable
    scored.push({ href, score });
  });

  scored.sort((a, b) => b.score - a.score);

  const out: string[] = [];
  for (const { href } of scored) {
    try {
      out.push(new URL(href, baseUrl).toString());
    } catch {
      /* skip unparseable href */
    }
  }
  return out;
}

/**
 * Fetch a competitor's favicon by domain. Tries the icons declared on its
 * homepage first, then the conventional /favicon.ico and /apple-touch-icon.png.
 * Returns null when nothing usable is found (caller serves 404 → initials).
 */
export async function fetchFavicon(domain: string): Promise<Favicon | null> {
  const parsed = validateUrlInput(domain);
  if (!parsed.ok) return null;
  const origin = `${parsed.url.protocol}//${parsed.url.host}`;

  const candidates: string[] = [];
  const page = await safeFetch(origin);
  if (page.ok) candidates.push(...iconHrefsFromHtml(page.html, page.finalUrl));
  candidates.push(`${origin}/favicon.ico`, `${origin}/apple-touch-icon.png`);

  const seen = new Set<string>();
  for (const url of candidates) {
    if (seen.has(url)) continue;
    seen.add(url);
    const icon = await fetchImage(url);
    if (icon) return icon;
  }
  return null;
}
