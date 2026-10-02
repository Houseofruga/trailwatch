import type { Competitor } from "./types";

// The model returns this exact string (instead of JSON) when it can't confidently
// name real competitors — the caller turns that into the manual-entry fallback.
export const EMPTY_SENTINEL = "NO_USABLE_INPUT";

// Candidates before the Shopify check (find.ts keeps the first 4 confirmed).
const MAX_COMPETITORS = 8;
// Ground the model on live web results (Exa) and/or the company's own site text.
// Capped for cost (this tool is unauthenticated). Large enough to fit the web
// candidates plus some site text.
const GROUNDING_CAP = 6000;

const SYSTEM = `You help the founder of a direct-to-consumer (DTC) brand find the online stores they compete with.

You are given a company (a name or website, and sometimes text from its site or live web results). Identify the BRANDS that sell similar products to a similar customer through their OWN online store (typically a Shopify store) — the stores a shopper would realistically compare with this one.

Respond with ONLY a JSON object — no markdown, no code fence, no preamble — with exactly this key:
- "competitors": an array of 6 to 8 objects {"name": string, "url": string, "why": string}, where "url" is the brand's own store homepage as a bare domain (e.g. "dewlane.com"), and "why" is one short clause (max ~12 words) on why it competes. Order by how directly they compete.

Rules:
- Only single-brand stores that sell their own products. NEVER include marketplaces, multi-brand retailers, department stores or aggregators (e.g. Amazon, Walmart, Target, Etsy, eBay, Flipkart, Myntra, Nykaa, Ajio, Meesho, Zalando, ASOS, Sephora, Ulta), and never social or review sites.
- If the company itself is a marketplace or big multi-brand retailer, return an empty array.
- If the context includes "Live web search results", use them to surface current and recent/niche brands you might not otherwise know, blended with well-established direct competitors. Skip listicle or SEO-spam entries.
- Never include the company itself. Only name real brands you are reasonably confident exist and are CURRENTLY OPERATING.
- If the company's country or primary market is evident (from its name, domain TLD, or website text), prefer brands selling in that same market.
- If you genuinely cannot identify real competing brands from the input, return an empty array — {"competitors": []} — and never invent companies.`;

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
