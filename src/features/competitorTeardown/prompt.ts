import type { ExtractedSite, PricingTier } from "./types";

// The model returns exactly this string (instead of JSON) when the provided
// text is empty/boilerplate and there's nothing real to analyze.
export const EMPTY_SENTINEL = "NO_USABLE_CONTENT";

// Cap each page before it reaches the prompt — the tool is unauthenticated and
// calls a paid model, so token cost has to stay bounded.
const PER_PAGE_CAP = 6000;

const SYSTEM = `You are a competitive analyst helping a busy founder size up a competitor from their public website.

You will be given text extracted from one or more of the competitor's public pages. Produce a concise, plain-English teardown.

Respond with ONLY a JSON object — no markdown, no code fence, no preamble — with exactly these keys:
- "positioning": 1-2 sentences on who this product is for and how it positions itself. Specific and plain; no marketing fluff, no restating the tagline verbatim.
- "pricingTiers": an array of {"name": string, "price": string, "notes": string|null} for each plan you can identify from the text, or null if pricing isn't present. Never invent prices — only report what the text supports.
- "whatToWatch": an array of 3 to 5 short strings naming the pages or signals a competitor-watcher should keep an eye on for this company, each with a brief why (e.g. "Pricing page — watch for annual-discount tests", "Changelog — they ship weekly").

If the provided text is empty, boilerplate, or gives you nothing real to analyze, respond with exactly ${EMPTY_SENTINEL} and nothing else.`;

export function buildPrompt(site: ExtractedSite): { system: string; user: string } {
  const body = site.pages
    .map((p) => `## ${p.label}\n${p.text.slice(0, PER_PAGE_CAP)}`)
    .join("\n\n");
  const user = `Competitor: ${site.title || site.url}\nURL: ${site.url}\n\n${body}`;
  return { system: SYSTEM, user };
}

export type ParsedTeardown = {
  positioning: string;
  pricingTiers: PricingTier[] | null;
  whatToWatch: string[];
};

/**
 * Parse a model reply into a teardown, defensively. Returns null when the model
 * declined (sentinel), returned no JSON, or gave a shape we can't use — the
 * caller turns null into a friendly "couldn't analyze that" message.
 */
export function parseTeardown(raw: string): ParsedTeardown | null {
  const text = raw.trim();
  if (!text || text.includes(EMPTY_SENTINEL)) return null;

  // Pull out the JSON object even if the model wrapped it in prose/fences.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }

  const positioning = typeof obj.positioning === "string" ? obj.positioning.trim() : "";
  if (!positioning) return null;

  const whatToWatch = Array.isArray(obj.whatToWatch)
    ? obj.whatToWatch.filter((s): s is string => typeof s === "string" && s.trim() !== "").map((s) => s.trim())
    : [];
  if (whatToWatch.length === 0) return null;

  const pricingTiers = Array.isArray(obj.pricingTiers)
    ? (obj.pricingTiers
        .map((t) => {
          if (!t || typeof t !== "object") return null;
          const tier = t as Record<string, unknown>;
          const name = typeof tier.name === "string" ? tier.name.trim() : "";
          const price = typeof tier.price === "string" ? tier.price.trim() : "";
          if (!name && !price) return null;
          const notes = typeof tier.notes === "string" && tier.notes.trim() !== "" ? tier.notes.trim() : null;
          return { name: name || "—", price: price || "—", notes };
        })
        .filter((t): t is PricingTier => t !== null))
    : null;

  return {
    positioning,
    pricingTiers: pricingTiers && pricingTiers.length > 0 ? pricingTiers : null,
    whatToWatch,
  };
}
