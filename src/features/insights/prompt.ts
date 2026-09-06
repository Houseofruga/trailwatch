import type { PricingTier } from "@/features/competitorTeardown";
import type { InsightInput } from "./types";

// The model returns exactly this string (instead of JSON) when the provided text
// is empty/boilerplate and there's nothing real to describe.
export const EMPTY_SENTINEL = "NO_USABLE_CONTENT";

// Cap the page text before it reaches the prompt — bounded token cost.
const PAGE_CAP = 6000;

// Page-FOCUSED (unlike competitorTeardown, which is company-level): describe the
// single page we baselined, so the "What we're now watching" card is genuinely
// about that page and reads as a watch statement, not a generic company blurb.
const SYSTEM = `You help a founder track ONE specific web page of a competitor. You'll be given the text of a single page and its label.

Describe what THIS page currently shows — the baseline we're now watching, so we can tell the founder when it changes. Focus only on the page in front of you, not the whole company.

Respond with ONLY a JSON object — no markdown, no code fence, no preamble — with exactly these keys:
- "summary": 1-2 plain-English sentences on what this specific page presents right now. Match the page: a pricing page → the plans and prices on offer; a homepage → how they position the product in their hero/messaging; a changelog or blog → what they've been shipping or posting; otherwise → what this page covers. Be specific and concrete; do NOT describe the whole company generically, and do NOT restate the tagline verbatim.
- "pricingTiers": an array of {"name": string, "price": string, "notes": string|null} for each plan present ON THIS PAGE, or null if this page has no pricing. Never invent prices — only report what the text supports.

If the text is empty, boilerplate, or gives you nothing real to describe, respond with exactly ${EMPTY_SENTINEL} and nothing else.`;

export function buildPagePrompt(input: InsightInput): { system: string; user: string } {
  const user = `Competitor: ${input.competitorName || input.url}
Page: ${input.label}
URL: ${input.url}

${input.text.slice(0, PAGE_CAP)}`;
  return { system: SYSTEM, user };
}

export type ParsedPageProfile = { summary: string; pricingTiers: PricingTier[] | null };

/**
 * Parse a model reply into a page profile, defensively. Returns null when the
 * model declined (sentinel), returned no JSON, or gave a shape we can't use —
 * the caller turns null into a quiet "unavailable" (the card just hides).
 */
export function parsePageProfile(raw: string): ParsedPageProfile | null {
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

  const summary = typeof obj.summary === "string" ? obj.summary.trim() : "";
  if (!summary) return null;

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

  return { summary, pricingTiers: pricingTiers && pricingTiers.length > 0 ? pricingTiers : null };
}
