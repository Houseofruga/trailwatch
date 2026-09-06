import OpenAI from "openai";
import { buildPrompt, NO_CHANGE_SENTINEL } from "./prompt";
import type { Summarizer } from "./types";

// Groq exposes an OpenAI-compatible API, so we reuse the openai SDK pointed at
// Groq's endpoint. GPT-OSS-20B: production (not preview), cheapest tier, plenty
// capable for a 1-2 sentence diff summary.
const MODEL = "openai/gpt-oss-20b";
const BASE_URL = "https://api.groq.com/openai/v1";

export function createGroqSummarizer(apiKey: string): Summarizer {
  const client = new OpenAI({ apiKey, baseURL: BASE_URL });

  return {
    async summarize(input) {
      const { system, user } = buildPrompt(input);

      const response = await client.chat.completions.create({
        model: MODEL,
        // gpt-oss-20b is a reasoning model: it spends completion tokens on hidden
        // reasoning BEFORE the answer. Two knobs keep the summary from being cut
        // off mid-sentence (finish_reason "length"):
        //  - reasoning_effort "low" — a diff summary needs little deliberation;
        //    this cuts reasoning tokens ~250 -> ~80 (also cheaper and faster).
        //  - max_tokens 700 — headroom for that reasoning plus a 1-2 sentence
        //    answer. Groq bills only tokens actually produced, so it's free slack.
        reasoning_effort: "low",
        max_tokens: 700,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });

      const text = (response.choices[0]?.message?.content ?? "").trim();

      if (!text || text === NO_CHANGE_SENTINEL) {
        return { skipped: true, reason: "model judged the change trivial" };
      }
      return { summary: text };
    },
  };
}
