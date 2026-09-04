// Orchestrator for "Find your competitors": if the visitor gave a URL/domain,
// ground the model on their actual site text (reusing the teardown's robots- and
// SSRF-safe extractSite); otherwise reason from the name alone. Mirrors the
// ok/reason shape of the other tools' analyze modules.

import { extractSite } from "../competitorTeardown/extract";
import { getFinderProvider } from "./index";
import type { FinderResult } from "./types";

// Heuristic: a single token with a dot and a TLD-looking suffix is a domain/URL.
function looksLikeUrl(input: string): boolean {
  const t = input.trim();
  if (/\s/.test(t)) return false;
  return /\.[a-z]{2,}(\/|$)/i.test(t);
}

export async function runFind(
  rawInput: string,
): Promise<{ ok: true; result: FinderResult } | { ok: false; reason: string }> {
  const company = rawInput.trim();
  if (!company) return { ok: false, reason: "Enter your company name or website." };

  let groundingText: string | null = null;
  let companyLabel = company;

  if (looksLikeUrl(company)) {
    const extracted = await extractSite(company);
    if (extracted.ok) {
      groundingText = extracted.site.pages.map((p) => p.text).join("\n\n");
      companyLabel = extracted.site.title || company;
    }
    // If extraction fails (JS-only site, blocked, etc.) we don't bail — the model
    // can still try from the domain alone.
  }

  const provider = getFinderProvider();
  const outcome = await provider.suggest({ company: companyLabel, groundingText });
  if (!outcome.ok) return { ok: false, reason: outcome.reason };
  return { ok: true, result: outcome.result };
}
