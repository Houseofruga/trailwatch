import OpenAI from "openai";
import { buildFinderPrompt, parseCompetitors } from "./prompt";
import type { FinderProvider } from "./types";

// Groq's OpenAI-compatible endpoint. gpt-oss-120b (same family as the 20b, but
// far better company/competitor recall and more accurate homepage URLs) — still
// free on Groq's tier. Verified available on the account 2026-09-05.
const MODEL = "openai/gpt-oss-120b";
const BASE_URL = "https://api.groq.com/openai/v1";
const MAX_TOKENS = 600;

export function createGroqFinder(apiKey: string): FinderProvider {
  const client = new OpenAI({ apiKey, baseURL: BASE_URL });

  return {
    async suggest({ company, groundingText }) {
      const { system, user } = buildFinderPrompt(company, groundingText);

      try {
        const response = await client.chat.completions.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        });

        const text = (response.choices[0]?.message?.content ?? "").trim();
        const competitors = parseCompetitors(text);
        if (!competitors) {
          return {
            ok: false,
            reason: "We couldn't find competitors for that — add them yourself below.",
          };
        }
        return { ok: true, result: { company, competitors, provider: "groq" } };
      } catch {
        // Any API error (incl. JSON-mode validation on a declined answer, rate
        // limits, timeouts) degrades to manual entry instead of 500-ing.
        return {
          ok: false,
          reason: "We couldn't find competitors for that — add them yourself below.",
        };
      }
    },
  };
}
