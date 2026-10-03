import { z } from "zod";
import { callFastModel, type ModelCall } from "@/features/ai/fastModel";
import type { Candidate, Classified } from "./candidates";
import { typicalQuantity } from "./units";

// A3 step 2: for shortlisted pairs only, how comparable are they? A score and
// a one-line reason the user can read ("Both are 30ml vitamin C serums").

export const JUDGE_SYSTEM = `You compare products from two different online stores and judge whether a shopper would see them as comparable alternatives: the same kind of product for the same use, at a similar size and format. Different brands and names are expected.

For each numbered pair, score 0 to 1:
- 0.9-1: clearly comparable (same product type, use and key attributes)
- 0.6-0.8: probably comparable, with some difference in material, format or target
- below 0.5: a different product, use or target
Write a reason of at most 12 words naming what they share or how they differ, e.g. "Both are 30ml vitamin C brightening serums" or "Duvet cover vs full bedding set".

Reply with JSON only: {"pairs":[{"i":0,"score":0.0,"reason":""}]}`;

function describe(c: Classified): string {
  const q = typicalQuantity(c.product);
  const size = q ? `, ${Math.round(q.amount * 10) / 10}${q.unit === "count" ? " ct" : q.unit}` : "";
  const attrs = c.cls.attributes.length ? `; ${c.cls.attributes.join(", ")}` : "";
  return `"${c.product.title}" (${c.cls.use || c.cls.subcategory}${attrs}; ${c.cls.packType}${size})`;
}

export function judgeLine(i: number, pair: Candidate): string {
  return `${i}. A: ${describe(pair.own)} | B: ${describe(pair.comp)}`;
}

const reply = z.object({
  pairs: z.array(z.object({ i: z.number().int(), score: z.number(), reason: z.string().default("") })),
});

export type Judgement = { confidence: number; reason: string };

export function parseJudgeReply(text: string, count: number): Map<number, Judgement> {
  const out = new Map<number, Judgement>();
  let json: unknown;
  try {
    json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  } catch {
    return out;
  }
  const parsed = reply.safeParse(json);
  if (!parsed.success) return out;
  for (const p of parsed.data.pairs) {
    if (p.i < 0 || p.i >= count) continue;
    out.set(p.i, { confidence: Math.max(0, Math.min(1, p.score)), reason: p.reason.trim().slice(0, 120) });
  }
  return out;
}

/** Judge a batch of pairs; retried once on invalid JSON. Throws on provider errors. */
export async function judgeBatch(pairs: Candidate[]): Promise<{ judgements: Map<number, Judgement>; calls: ModelCall[] }> {
  const user = pairs.map((p, i) => judgeLine(i, p)).join("\n");
  const calls: ModelCall[] = [];
  let judgements = new Map<number, Judgement>();
  for (let attempt = 0; attempt < 2 && judgements.size < pairs.length; attempt++) {
    const res = await callFastModel(JUDGE_SYSTEM, user, 40 * pairs.length);
    if (!res) break;
    calls.push(res.call);
    const parsed = parseJudgeReply(res.text, pairs.length);
    if (parsed.size > judgements.size) judgements = parsed;
  }
  return { judgements, calls };
}
