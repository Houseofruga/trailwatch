import type { Competitor } from "./types";

// The model returns this exact string (instead of JSON) when it can't confidently
// name real competitors — the caller turns that into the manual-entry fallback.
export const EMPTY_SENTINEL = "NO_USABLE_INPUT";

const MAX_COMPETITORS = 4;
// Ground the model on live web results (Exa) and/or the company's own site text.
// Capped for cost (this tool is unauthenticated). Large enough to fit the web
// candidates plus some site text.
const GROUNDING_CAP = 6000;

const SYSTEM = `You help a founder find direct competitors to monitor.

You are given a company (a name, and sometimes text extracted from its website). Identify its most relevant DIRECT competitors — products a customer would realistically evaluate as alternatives.

Respond with ONLY a JSON object — no markdown, no code fence, no preamble — with exactly this key:
- "competitors": an array of 3 to 4 objects {"name": string, "url": string, "why": string}, where "url" is the competitor's best-guess homepage as a bare domain (e.g. "linear.app"), and "why" is one short clause (max ~12 words) on why it competes. Order by how directly they compete.

If the context includes "Live web search results", use them to surface CURRENT and recent/niche competitors you might not otherwise know, and to prioritise ones that are clearly still active. Blend them with the well-established direct competitors you already know — aim for a mix of the most relevant established players and any strong recent/niche ones from the results, rather than only obscure names. Only include a company if it is clearly a real, operating product (either named in the results as an actual product, or well-known to you) — skip vague, listicle, or SEO-spam entries. Never include the company itself in the list — only its competitors. Only name real companies you are reasonably confident exist and that are CURRENTLY OPERATING — exclude any product that has shut down, been discontinued, or was acquired and folded into another product. If the company's country or primary market is evident (from its name, domain TLD, or website text), prefer competitors that operate in that same region. Prefer specific direct product competitors over broad categories. If you genuinely cannot identify real competitors from the input, return an empty array — {"competitors": []} — and never invent companies.`;

export function buildFinderPrompt(
  company: string,
  groundingText: string | null,
): { system: string; user: string } {
  const grounding = groundingText
    ? `\n\nContext (live web results and/or the company's own site):\n${groundingText.slice(0, GROUNDING_CAP)}`
    : "";
  return { system: SYSTEM, user: `Company: ${company}${grounding}` };
}

/**
 * Parse a model reply into a competitor list, defensively. Returns null when the
 * model declined (sentinel), returned no JSON, or gave nothing usable — the
 * caller turns null into the manual-entry fallback.
 */
export function parseCompetitors(raw: string): Competitor[] | null {
  const text = raw.trim();
  if (!text || text.includes(EMPTY_SENTINEL)) return null;

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (!Array.isArray(obj.competitors)) return null;

  const competitors = obj.competitors
    .map((c) => {
      if (!c || typeof c !== "object") return null;
      const rec = c as Record<string, unknown>;
      const name = typeof rec.name === "string" ? rec.name.trim() : "";
      if (!name) return null;
      const url = typeof rec.url === "string" ? rec.url.trim() : "";
      const why = typeof rec.why === "string" ? rec.why.trim() : "";
      return { name, url, why };
    })
    .filter((c): c is Competitor => c !== null)
    .slice(0, MAX_COMPETITORS);

  return competitors.length > 0 ? competitors : null;
}
