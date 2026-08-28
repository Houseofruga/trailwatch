// Discover and analyze a site's sitemaps. Reuses the SSRF-guarded fetch from
// the lastUpdated feature and the pure parsers in ./parse. Discovery = the
// Sitemap: lines in robots.txt plus the common well-known paths; sitemap
// indexes are expanded one level.

import { safeFetch } from "../lastUpdated/fetch";
import { validateUrlInput } from "../lastUpdated/ssrf";
import { classifySitemap, parseSitemapDeclarations, type SitemapKind } from "./parse";

const COMMON_PATHS = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml"];
const MAX_CHILDREN = 30; // cap child sitemaps fetched from an index
const FETCH_OPTS = { maxBytes: 8_000_000 } as const;

export type SitemapEntry = {
  url: string;
  ok: boolean;
  kind: SitemapKind;
  /** page URLs (urlset) or child sitemaps (index) */
  entryCount: number;
  lastmod: string | null;
  fromRobots: boolean;
  error?: string;
};

export type FinderResult = {
  base: string;
  declaredInRobots: boolean;
  sitemaps: SitemapEntry[];
  totalUrls: number;
  totalSitemapFiles: number;
  truncated: boolean; // an index had more children than we fetched
};

function normalize(u: string): string {
  try {
    const url = new URL(u);
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`.toLowerCase();
  } catch {
    return u.toLowerCase();
  }
}

type Classified =
  | { url: string; ok: true; kind: SitemapKind; entryCount: number; lastmod: string | null; children: string[] }
  | { url: string; ok: false; error: string };

async function fetchClassify(url: string): Promise<Classified> {
  const res = await safeFetch(url, FETCH_OPTS);
  if (!res.ok) return { url, ok: false, error: res.message };
  const cls = classifySitemap(res.html);
  if (cls.kind === "unknown") return { url: res.finalUrl, ok: false, error: "Not a valid sitemap." };
  return {
    url: res.finalUrl,
    ok: true,
    kind: cls.kind,
    entryCount: cls.entryCount,
    lastmod: cls.lastmod,
    children: cls.childSitemaps,
  };
}

export async function findSitemaps(
  rawUrl: string,
): Promise<{ ok: true; result: FinderResult } | { ok: false; message: string }> {
  const parsed = validateUrlInput(rawUrl);
  if (!parsed.ok) return { ok: false, message: parsed.reason };
  const origin = parsed.url.origin;

  // 1. robots.txt → declared sitemaps.
  let declared: string[] = [];
  const robots = await safeFetch(`${origin}/robots.txt`, FETCH_OPTS);
  if (robots.ok) declared = parseSitemapDeclarations(robots.html);
  const declaredSet = new Set(declared.map(normalize));

  // 2. Top-level candidates = declared + common paths.
  const topCandidates = [...new Set([...declared, ...COMMON_PATHS.map((p) => `${origin}${p}`)])];
  const topResults = await Promise.all(topCandidates.map(fetchClassify));

  const entries: SitemapEntry[] = [];
  const seen = new Set<string>();
  const childUrls: string[] = [];
  let truncated = false;

  topResults.forEach((r, i) => {
    const fromRobots = declaredSet.has(normalize(topCandidates[i]));
    if (!r.ok) {
      // Only surface a failure for something the site explicitly declared —
      // a probed common path that 404s is just absent, not an error.
      if (fromRobots) {
        entries.push({ url: topCandidates[i], ok: false, kind: "unknown", entryCount: 0, lastmod: null, fromRobots: true, error: r.error });
      }
      return;
    }
    if (seen.has(normalize(r.url))) return;
    seen.add(normalize(r.url));
    entries.push({ url: r.url, ok: true, kind: r.kind, entryCount: r.entryCount, lastmod: r.lastmod, fromRobots });
    if (r.kind === "index") {
      for (const c of r.children) {
        if (childUrls.length >= MAX_CHILDREN) {
          truncated = true;
          break;
        }
        if (!seen.has(normalize(c))) childUrls.push(c);
      }
    }
  });

  // 3. Expand index children one level.
  const childResults = await Promise.all(childUrls.map(fetchClassify));
  for (const r of childResults) {
    if (!r.ok || seen.has(normalize(r.url))) continue;
    seen.add(normalize(r.url));
    entries.push({ url: r.url, ok: true, kind: r.kind, entryCount: r.entryCount, lastmod: r.lastmod, fromRobots: false });
  }

  const urlsets = entries.filter((e) => e.ok && e.kind === "urlset");
  const totalUrls = urlsets.reduce((sum, e) => sum + e.entryCount, 0);
  const totalSitemapFiles = entries.filter((e) => e.ok && (e.kind === "urlset" || e.kind === "index")).length;

  return {
    ok: true,
    result: { base: origin, declaredInRobots: declared.length > 0, sitemaps: entries, totalUrls, totalSitemapFiles, truncated },
  };
}
