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

export function isMeaningfulChange(oldText: string, newText: string): MeaningfulChangeResult {
  if (collapseForCompare(oldText) === collapseForCompare(newText)) {
    return { meaningful: false, reason: "identical after ignoring whitespace and case" };
  }

  const oldLines = linesOf(oldText);
  const newLines = linesOf(newText);
  const changedLines = [
    ...[...newLines].filter((line) => !oldLines.has(line)),
    ...[...oldLines].filter((line) => !newLines.has(line)),
  ];

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
