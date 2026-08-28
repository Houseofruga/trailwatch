// Pure extraction of "last updated" signals from a page. No network here —
// fetch.ts gathers the raw inputs (response headers, HTML, sitemap lastmod)
// and hands them in, so this stays deterministic and unit-testable.

import * as cheerio from "cheerio";

export type Confidence = "high" | "medium" | "low";

export type DateSignal = {
  source: string; // human label, e.g. "Last-Modified header"
  iso: string; // normalized ISO timestamp
  raw: string; // the original string we parsed
  confidence: Confidence;
};

export type DetectResult = {
  signals: DateSignal[];
  bestGuess: DateSignal | null;
};

export type DetectInput = {
  /** Response headers, lowercased keys. */
  headers: Record<string, string>;
  html: string;
  /** <lastmod> for this exact URL from the site's sitemap, if found. */
  sitemapLastmod?: string | null;
};

const CONFIDENCE_RANK: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };

/** Parse a date string; return ISO if it's a real, plausible date, else null. */
function toIso(value: string | undefined | null): string | null {
  if (!value) return null;
  const t = Date.parse(value.trim());
  if (Number.isNaN(t)) return null;
  const year = new Date(t).getUTCFullYear();
  // Guard against garbage that parses to absurd years.
  if (year < 1995 || year > 2100) return null;
  return new Date(t).toISOString();
}

function pushSignal(
  out: DateSignal[],
  source: string,
  raw: string | undefined | null,
  confidence: Confidence,
): void {
  const iso = toIso(raw ?? undefined);
  if (iso && raw) out.push({ source, iso, raw: raw.trim(), confidence });
}

/** Recursively collect any `dateModified` values from a JSON-LD node. */
function collectDateModified(node: unknown, out: string[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectDateModified(item, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  const dm = obj.dateModified;
  if (typeof dm === "string") out.push(dm);
  for (const key of Object.keys(obj)) collectDateModified(obj[key], out);
}

export function detectLastUpdated(input: DetectInput): DetectResult {
  const signals: DateSignal[] = [];
  const $ = cheerio.load(input.html);

  // 1. Explicit content-modified meta tags — the most trustworthy.
  pushSignal(
    signals,
    "article:modified_time meta tag",
    $('meta[property="article:modified_time"]').attr("content"),
    "high",
  );
  pushSignal(
    signals,
    "og:updated_time meta tag",
    $('meta[property="og:updated_time"]').attr("content"),
    "medium",
  );
  pushSignal(
    signals,
    '<meta name="last-modified">',
    $('meta[name="last-modified"]').attr("content"),
    "medium",
  );

  // 2. JSON-LD dateModified (schema.org Article / WebPage / etc.).
  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).contents().text();
    if (!text.trim()) return;
    try {
      const parsed = JSON.parse(text);
      const dates: string[] = [];
      collectDateModified(parsed, dates);
      for (const d of dates) pushSignal(signals, "JSON-LD dateModified", d, "high");
    } catch {
      // Malformed JSON-LD is common; skip it.
    }
  });

  // 3. Sitemap <lastmod> for this URL.
  pushSignal(signals, "Sitemap lastmod", input.sitemapLastmod, "medium");

  // 4. Last-Modified response header — real, but many servers return "now"
  //    on every request for dynamic pages, so it's only medium confidence.
  pushSignal(signals, "Last-Modified header", input.headers["last-modified"], "medium");

  const bestGuess = pickBest(signals);
  return { signals: dedupe(signals), bestGuess };
}

/** Highest confidence wins; ties break toward the most recent date. */
function pickBest(signals: DateSignal[]): DateSignal | null {
  if (signals.length === 0) return null;
  return [...signals].sort((a, b) => {
    const byConf = CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
    if (byConf !== 0) return byConf;
    return b.iso.localeCompare(a.iso);
  })[0];
}

/** Drop exact source+iso duplicates (e.g. the same JSON-LD date twice). */
function dedupe(signals: DateSignal[]): DateSignal[] {
  const seen = new Set<string>();
  const out: DateSignal[] = [];
  for (const s of signals) {
    const key = `${s.source}|${s.iso}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}
