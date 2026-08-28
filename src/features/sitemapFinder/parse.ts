// Pure parsing for the Sitemap Finder — no network here, so it's deterministic
// and unit-tested. analyze.ts does the fetching and wires these together.

import * as cheerio from "cheerio";

/** Extract `Sitemap:` declarations from a robots.txt body. */
export function parseSitemapDeclarations(robotsTxt: string): string[] {
  const out: string[] = [];
  for (const line of robotsTxt.split(/\r?\n/)) {
    const m = line.match(/^\s*sitemap\s*:\s*(\S+)/i);
    if (m) out.push(m[1].trim());
  }
  return out;
}

export type SitemapKind = "index" | "urlset" | "unknown";

export type SitemapClassification = {
  kind: SitemapKind;
  /** Child sitemap URLs (only for an index). */
  childSitemaps: string[];
  /** Number of page URLs (for a urlset) or child sitemaps (for an index). */
  entryCount: number;
  /** Most recent <lastmod> found, if any (ISO-ish string as published). */
  lastmod: string | null;
};

/** Classify a sitemap XML: index vs urlset, with counts and child links. */
export function classifySitemap(xml: string): SitemapClassification {
  const $ = cheerio.load(xml, { xmlMode: true });

  const sitemapNodes = $("sitemapindex > sitemap, sitemap");
  const urlNodes = $("urlset > url, url");

  // An index lists <sitemap> children; a urlset lists <url> children.
  const isIndex = $("sitemapindex").length > 0 || sitemapNodes.length > urlNodes.length;

  if (isIndex && sitemapNodes.length > 0) {
    const childSitemaps: string[] = [];
    const lastmods: string[] = [];
    sitemapNodes.each((_, el) => {
      const loc = $(el).children("loc").first().text().trim();
      if (loc) childSitemaps.push(loc);
      const lm = $(el).children("lastmod").first().text().trim();
      if (lm) lastmods.push(lm);
    });
    return {
      kind: "index",
      childSitemaps,
      entryCount: childSitemaps.length,
      lastmod: mostRecent(lastmods),
    };
  }

  if (urlNodes.length > 0) {
    const lastmods: string[] = [];
    urlNodes.each((_, el) => {
      const lm = $(el).children("lastmod").first().text().trim();
      if (lm) lastmods.push(lm);
    });
    return {
      kind: "urlset",
      childSitemaps: [],
      entryCount: urlNodes.length,
      lastmod: mostRecent(lastmods),
    };
  }

  return { kind: "unknown", childSitemaps: [], entryCount: 0, lastmod: null };
}

/** Pick the most recent parseable date from a list of lastmod strings. */
function mostRecent(values: string[]): string | null {
  let best: { raw: string; t: number } | null = null;
  for (const v of values) {
    const t = Date.parse(v);
    if (Number.isNaN(t)) continue;
    if (!best || t > best.t) best = { raw: v, t };
  }
  return best?.raw ?? null;
}
