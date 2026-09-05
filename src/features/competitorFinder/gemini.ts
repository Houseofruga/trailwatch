import OpenAI from "openai";
import { buildFinderPrompt, parseCompetitors } from "./prompt";
import type { FinderProvider } from "./types";

// Gemini via its OpenAI-compatible endpoint (same SDK shape as the Groq finder),
// with **Google Search grounding** so suggestions reflect the live web — fixing
// the offline model's staleness/geo gaps (e.g. it won't suggest a shut-down
// product). Free tier: gemini-2.5-flash tokens are free and grounding is free up
// to 500 requests/day (shared with Flash-Lite); past that a keyless/unbilled
// project just returns 429 — which the provider chain (index.ts) catches and
// falls back to the offline Groq finder, so it can never incur a charge.
const MODEL = "gemini-2.5-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const MAX_TOKENS = 700;

// Gemini-only tool; not in the OpenAI SDK's tool union, so cast past the types.
const GOOGLE_SEARCH_TOOL = [
  { type: "google_search" },
] as unknown as OpenAI.Chat.Completions.ChatCompletionTool[];

export function createGeminiFinder(apiKey: string): FinderProvider {
  const client = new OpenAI({ apiKey, baseURL: BASE_URL });

  return {
    async suggest({ company, groundingText }) {
      const { system, user } = buildFinderPrompt(company, groundingText);

      try {
        const response = await client.chat.completions.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          // Grounding can't be combined with JSON response_format, so we ask for
          // JSON in the prompt and parse defensively (parseCompetitors).
          tools: GOOGLE_SEARCH_TOOL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        });

        const text = (response.choices[0]?.message?.content ?? "").trim();
        const competitors = parseCompetitors(text);
        if (!competitors) {
          return { ok: false, reason: "We couldn't find competitors for that." };
        }
        return { ok: true, result: { company, competitors, provider: "gemini" } };
      } catch {
        // Quota (429 past the free 500/day), timeout, or any API error → let the
        // chain fall through to the offline finder instead of failing the tool.
        return { ok: false, reason: "We couldn't find competitors for that." };
      }
    },
  };
}
