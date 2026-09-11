// Live web grounding for the finder via Exa (exa.ai) — a search API built for
// LLMs. We run one /search for the company's competitors/alternatives and return
// the current results as a text block; runFind feeds that to the Groq model,
// which reads the LIVE results (not just its training data) and extracts the
// competitor list. This is what makes the finder work for recent/niche startups.
//
// Free tier: monthly credits with no card on file, so a bill is impossible — when
// the credits run out, /search errors and we return null, and the finder falls
// back to the offline model. Enabled only when EXA_API_KEY is set.
import { isDirectoryDomain } from "./directoryDomains";

const ENDPOINT = "https://api.exa.ai/search";

function bareDomain(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

type ExaResult = { title?: string; url?: string; text?: string };

// A real competitor candidate from live search — used both as model grounding
// (the text block) and to correct the model's guessed homepage URLs in runFind.
export type ExaCandidate = { title: string; domain: string };

export type ExaContext = { text: string; candidates: ExaCandidate[] };

/**
 * Ask Exa for current competitor candidates. Returns a compact text block for
 * the model to ground on PLUS the structured domains (real, from live search),
 * or null (no key, error, or no results) so the caller degrades to the offline
 * model.
 */
export async function fetchCompetitorContext(
  company: string,
  isUrl: boolean,
  apiKey: string,
): Promise<ExaContext | null> {
  const query = isUrl
    ? `Direct competitors of and alternatives to the company at ${company}`
    : `Direct competitors of and alternatives to ${company}`;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        query,
        type: "auto",
        numResults: 8,
        contents: { text: { maxCharacters: 280 } },
      }),
    });
    if (!res.ok) return null;

    const data: unknown = await res.json();
    const results: ExaResult[] = Array.isArray((data as { results?: unknown })?.results)
      ? ((data as { results: ExaResult[] }).results)
      : [];
    if (results.length === 0) return null;

    const candidates: ExaCandidate[] = [];
    const lines = results
      .map((r) => {
        const domain = bareDomain(r.url);
        // Drop directory/aggregator hits (LinkedIn, Crunchbase, G2, …): they rank
        // high for "competitors of X" but are never a competitor's own homepage,
        // so they must not seed the grounding text or the URL-correction set.
        if (!domain || isDirectoryDomain(domain)) return null;
        const title = (r.title ?? domain).trim();
        candidates.push({ title, domain });
        const snippet = (r.text ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
        return `- ${title} (${domain})${snippet ? `: ${snippet}` : ""}`;
      })
      .filter((l): l is string => l !== null);
    if (lines.length === 0) return null;

    const text =
      "Live web search results — current candidate competitors (may include recent or niche companies; use these as your primary source):\n" +
      lines.join("\n");
    return { text, candidates };
  } catch {
    return null;
  }
}
