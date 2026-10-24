// SPEC.md F4 — the core differentiator. Callers are expected to pass text
// that has already been through normalize.ts's normalizeText, matching how
// the check engine will use this (SPEC.md §3: snapshots.content_text is
// "normalized main-content text").

export type MeaningfulChangeResult = { meaningful: boolean; reason: string };

// Small enough to catch one-word tweaks; a real paragraph or sentence change
// clears it easily. Tune from real reports once there's usage to learn from.
const NOISE_CHAR_THRESHOLD = 24;

// Deliberately not "contains any digit" — dates and counters contain digits
// too, which is exactly what normalize.ts's volatile-pattern stripping exists
// to keep out of this function's input in the first place.
const PRICE_SIGNAL =
  /[$£€]\s?\d|\b\d+(\.\d+)?\s?(usd|gbp|eur|dollars|%|gb|tb|mb|kb)\b|\/\s?(month|mo|user|seat|yr|year)\b|\bper\s+(month|user|seat|year)\b/i;

function collapseForCompare(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function linesOf(text: string): Set<string> {
  return new Set(
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

// The whole lines that differ between two versions, split into those only in the
// new text and those only in the old. Shared by the noise filter (which counts
// their characters) and the summarizer prompt (which shows them to the model,
// rather than the first N chars of each full page). One definition keeps "what
// changed" identical on both sides.
export function diffLines(oldText: string, newText: string): { added: string[]; removed: string[] } {
  const oldLines = linesOf(oldText);
  const newLines = linesOf(newText);
  return {
    added: [...newLines].filter((line) => !oldLines.has(line)),
    removed: [...oldLines].filter((line) => !newLines.has(line)),
  };
}

export function isMeaningfulChange(oldText: string, newText: string): MeaningfulChangeResult {
  if (collapseForCompare(oldText) === collapseForCompare(newText)) {
    return { meaningful: false, reason: "identical after ignoring whitespace and case" };
  }

  const { added, removed } = diffLines(oldText, newText);
  const changedLines = [...added, ...removed];

  if (changedLines.length === 0) {
    return { meaningful: false, reason: "identical after ignoring whitespace and case" };
  }

  const changedCharCount = changedLines.reduce((total, line) => total + line.length, 0);
  const hasPriceSignal = changedLines.some((line) => PRICE_SIGNAL.test(line));

  if (changedCharCount < NOISE_CHAR_THRESHOLD && !hasPriceSignal) {
    return {
      meaningful: false,
      reason: `${changedCharCount}-character edit below the noise threshold`,
    };
  }

  if (hasPriceSignal) {
    return {
      meaningful: true,
      reason: "changed line contains a price, percentage, or plan-limit figure",
    };
  }

  return {
    meaningful: true,
    reason: `${changedCharCount}-character change exceeds the noise threshold`,
  };
}

/**
 * The page versions (content hashes) a page's recent change events went from
 * and to. A page that switches back to one of these is toggling between
 * versions (an A/B test, two servers or caches answering differently), not
 * changing: seen 2026-10 on a sale page flipping between 112 and 149 products
 * every few hours. Events from before 2026-10-24 carry no hashes.
 */
export function versionsSeen(payloads: Record<string, unknown>[]): Set<string> {
  const seen = new Set<string>();
  for (const p of payloads) {
    for (const h of [p.contentHash, p.previousHash]) if (typeof h === "string" && h) seen.add(h);
  }
  return seen;
}
