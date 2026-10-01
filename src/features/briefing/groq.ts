import OpenAI from "openai";
import { GROQ_BASE_URL, GROQ_LARGE_MODEL } from "@/features/ai/models";
import { parseInterpretation, type BriefingInput } from "./content";
import type { BatchEntry } from "./batch";
import { BRIEFING_SYSTEM, buildBriefingMessage } from "./prompt";

// The briefing on Groq's free tier, used while there's no Anthropic key: one
// call per user, made right away (no batch). gpt-oss-120b is Groq's strongest
// model; "medium" reasoning gives it room to rank the week's moves and find the
// pattern, and max_tokens leaves headroom for that hidden reasoning plus the
// JSON (Groq bills only tokens produced).
export const GROQ_BRIEFING_MODEL = GROQ_LARGE_MODEL;
const MAX_TOKENS = 4000;

export function groqAvailable(): boolean {
  return !!process.env.GROQ_API_KEY;
}

/** One user's interpretation. Tries twice: a rate limit or a malformed reply is often a one-off. */
export async function interpretWithGroq(input: BriefingInput): Promise<BatchEntry> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { ok: false, reason: "GROQ_API_KEY is not set" };
  const client = new OpenAI({ apiKey: key, baseURL: GROQ_BASE_URL });

  let reason = "unparseable model reply";
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 3000));
    try {
      const response = await client.chat.completions.create({
        model: GROQ_BRIEFING_MODEL,
        reasoning_effort: "medium",
        max_tokens: MAX_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: BRIEFING_SYSTEM },
          { role: "user", content: buildBriefingMessage(input) },
        ],
      });
      const usage = {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      };
      // gpt-oss likes non-breaking hyphens (U+2011), which some mail fonts lack.
      const text = (response.choices[0]?.message?.content ?? "").replace(/[‐‑]/g, "-");
      const interpretation = parseInterpretation(text);
      if (interpretation) return { ok: true, interpretation, usage };
      reason = "unparseable model reply";
    } catch (err) {
      reason = `Groq error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  return { ok: false, reason };
}
