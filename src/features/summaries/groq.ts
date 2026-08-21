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
        max_tokens: 256,
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
