// SPEC.md F3.3: "collapse whitespace, drop volatile boilerplate (timestamps,
// CSRF tokens, etc.)". Stripping these here — before anything is diffed or
// hashed — means a page whose only change is "2 hours ago" -> "3 hours ago"
// never even reaches the noise filter as a diff.
const VOLATILE_PATTERNS: RegExp[] = [
  // Relative timestamps: "2 hours ago", "in 3 days"
  /\b\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago\b/gi,
  /\bin\s+\d+\s+(second|minute|hour|day|week|month|year)s?\b/gi,
  // Absolute dates: "Aug 14, 2026", "14 August 2026"
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?(,?\s*\d{4})?\b/gi,
  /\b\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(,?\s*\d{4})?\b/gi,
  // Numeric dates: "14/08/2026", "2026-08-14"
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
  // Copyright years: "© 2026", "(c) 2026"
  /©\s?\d{4}/g,
  /\(c\)\s?\d{4}/gi,
  // Session/CSRF-token-looking strings: long hex or base64-ish runs
  /\b[a-f0-9]{16,}\b/gi,
];

/**
 * Collapses horizontal whitespace within each line and strips volatile
 * boilerplate, but preserves line breaks — the noise filter diffs
 * line-by-line, and this is also what gets hashed for content_hash, so the
 * output needs to be deterministic for identical-looking pages.
 */
export function normalizeText(text: string): string {
  let result = text;
  for (const pattern of VOLATILE_PATTERNS) {
    result = result.replace(pattern, " ");
  }

  const lines = result
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0);

  return lines.join("\n");
}
