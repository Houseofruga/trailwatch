import { z } from "zod";
import { diffLines } from "@/features/checks/noiseFilter";
import type { PageEventType } from "./types";

export type ClassifyInput = {
  storeName: string;
  pageKind: string; // homepage | sale | shipping_policy | refund_policy
  oldText: string;
  newText: string;
};

export type Classification = {
  type: PageEventType;
  summary: string;
  discountPct: number | null;
  code: string | null;
  freeShippingThreshold: number | null; // dollars
};

// Only the changed lines go to the model (same approach as summaries/prompt.ts):
// cheap, and the shared nav/hero boilerplate can't drown out the real change.
const EXCERPT_CAP = 2000;

const SYSTEM = `You classify a change on a competitor's online store page for the founder of a direct-to-consumer brand.

Reply with ONLY a JSON object, no prose:
{"type": "...", "summary": "...", "discountPct": number|null, "code": string|null, "freeShippingThreshold": number|null}

type — exactly one of:
- "promo_launched": a new or changed promotion — a sale, discount, promo code, bundle deal, gift with purchase, or free-shipping offer.
- "positioning_shift": how they present the brand or products changed — new headline, value proposition, hero message, featured category, or target customer.
- "policy_change": shipping, returns, refunds, or warranty terms changed (costs, thresholds, time windows).
- "cosmetic": nothing a competitor would act on — reworded boilerplate, reordering, image swaps without a new message, dates, counters.

summary — one plain-English sentence saying what changed, with the specific numbers (e.g. "Dewlane started a 25% off sitewide sale with code GLOW25."). No HTML, no markdown.
discountPct — the headline discount percentage if a promo states one, else null.
code — the promo code if one is shown, else null.
freeShippingThreshold — the order minimum in dollars for free shipping if stated (new value), else null.`;

export function buildClassifierPrompt(input: ClassifyInput): { system: string; user: string } {
  const { added, removed } = diffLines(input.oldText, input.newText);
  const hasLineDiff = added.length > 0 || removed.length > 0;
  const before = (hasLineDiff ? removed.join("\n") : input.oldText).slice(0, EXCERPT_CAP);
  const after = (hasLineDiff ? added.join("\n") : input.newText).slice(0, EXCERPT_CAP);

  const user = `Store: ${input.storeName}
Page: ${input.pageKind}

REMOVED:
${before || "(nothing)"}

ADDED:
${after || "(nothing)"}`;
  return { system: SYSTEM, user };
}

const numberOrNull = z.preprocess(
  (v) => (typeof v === "string" ? Number.parseFloat(v.replace(/[^0-9.]/g, "")) : v),
  z.number().finite().nonnegative().nullable().catch(null),
);

const schema = z.object({
  type: z.enum(["promo_launched", "positioning_shift", "policy_change", "cosmetic"]),
  summary: z.string().trim().min(1),
  discountPct: numberOrNull.optional().default(null),
  code: z.string().trim().min(1).nullable().catch(null).optional().default(null),
  freeShippingThreshold: numberOrNull.optional().default(null),
});

/** Parse the model's reply; tolerates a ```json fence or text around the object. */
export function parseClassification(text: string): Classification | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(text.slice(start, end + 1)));
    return parsed.success ? (parsed.data as Classification) : null;
  } catch {
    return null;
  }
}
