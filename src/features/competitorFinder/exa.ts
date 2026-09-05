// Live web grounding for the finder via Exa (exa.ai) — a search API built for
// LLMs. We run one /search for the company's competitors/alternatives and return
// the current results as a text block; runFind feeds that to the Groq model,
// which reads the LIVE results (not just its training data) and extracts the
// competitor list. This is what makes the finder work for recent/niche startups.
//
// Free tier: monthly credits with no card on file, so a bill is impossible — when
// the credits run out, /search errors and we return null, and the finder falls
// back to the offline model. Enabled only when EXA_API_KEY is set.
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

/**
 * Ask Exa for current competitor candidates. Returns a compact text block for
 * the model to ground on, or null (no key, error, or no results) so the caller
 * degrades to the offline model.
 */
export async function fetchCompetitorContext(
  company: string,
  isUrl: boolean,
  apiKey: string,
): Promise<string | null> {
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

    const lines = results
      .map((r) => {
        const domain = bareDomain(r.url);
        if (!domain) return null;
        const snippet = (r.text ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
        return `- ${(r.title ?? domain).trim()} (${domain})${snippet ? `: ${snippet}` : ""}`;
      })
      .filter((l): l is string => l !== null);
    if (lines.length === 0) return null;

    return (
      "Live web search results — current candidate competitors (may include recent or niche companies; use these as your primary source):\n" +
      lines.join("\n")
    );
  } catch {
    return null;
  }
}
