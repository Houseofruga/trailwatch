// Orchestrator for "Find your competitors": if the visitor gave a URL/domain,
// ground the model on their actual site text (reusing the teardown's robots- and
// SSRF-safe extractSite); otherwise reason from the name alone. Mirrors the
// ok/reason shape of the other tools' analyze modules.

import { lookup } from "node:dns/promises";
import { extractSite } from "../competitorTeardown/extract";
import { fetchCompetitorContext } from "./exa";
import { getFinderProvider } from "./index";
import type { Competitor, FinderResult } from "./types";

// Heuristic: a single token with a dot and a TLD-looking suffix is a domain/URL.
function looksLikeUrl(input: string): boolean {
  const t = input.trim();
  if (/\s/.test(t)) return false;
  return /\.[a-z]{2,}(\/|$)/i.test(t);
}

// The model emits a best-guess homepage, which is sometimes a domain that
// doesn't exist (wrong TLD, typo). Confirm each resolves in DNS and blank the
// URL if it doesn't — we keep the competitor name (it's likely real; only the
// guessed URL was off) so the user can correct it, rather than tracking a dead
// link. A DNS check (not an HTTP fetch) is used on purpose: it catches
// nonexistent domains without wrongly dropping real sites that block bots.
async function domainResolves(url: string): Promise<boolean> {
  let host: string;
  try {
    host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname;
  } catch {
    return false;
  }
  try {
    const res = await lookup(host);
    return Boolean(res.address);
  } catch {
    return false;
  }
}

async function verifyUrls(competitors: Competitor[]): Promise<Competitor[]> {
  return Promise.all(
    competitors.map(async (c) =>
      c.url && (await domainResolves(c.url)) ? c : { ...c, url: "" },
    ),
  );
}

export async function runFind(
  rawInput: string,
): Promise<{ ok: true; result: FinderResult } | { ok: false; reason: string }> {
  const company = rawInput.trim();
  if (!company) return { ok: false, reason: "Enter your company name or website." };

  const isUrl = looksLikeUrl(company);
  let siteText: string | null = null;
  let companyLabel = company;

  if (isUrl) {
    const extracted = await extractSite(company);
    if (extracted.ok) {
      siteText = extracted.site.pages.map((p) => p.text).join("\n\n");
      companyLabel = extracted.site.title || company;
    }
    // If extraction fails (JS-only site, blocked, etc.) we don't bail — the model
    // can still try from the domain alone.
  }

  // Live web grounding (Exa) — the key to recent/niche competitors. Placed FIRST
  // so it survives the prompt's grounding cap and the model treats it as primary.
  // Null (no key / error / out of free credits) → we just use the site text.
  const exaKey = process.env.EXA_API_KEY;
  const exaContext = exaKey ? await fetchCompetitorContext(company, isUrl, exaKey) : null;
  const groundingText = [exaContext, siteText].filter(Boolean).join("\n\n") || null;

  const provider = getFinderProvider();
  const outcome = await provider.suggest({ company: companyLabel, groundingText });
  if (!outcome.ok) return { ok: false, reason: outcome.reason };

  const competitors = await verifyUrls(outcome.result.competitors);
  return { ok: true, result: { ...outcome.result, competitors } };
}
