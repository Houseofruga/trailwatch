import OpenAI from "openai";
import { buildPrompt, parseTeardown } from "./prompt";
import type { TeardownProvider } from "./types";

// Groq's OpenAI-compatible endpoint, same as the change summarizer. JSON mode
// keeps the reply parseable; the prompt still defines the exact shape.
const MODEL = "openai/gpt-oss-20b";
const BASE_URL = "https://api.groq.com/openai/v1";
const MAX_TOKENS = 900;

export function createGroqTeardown(apiKey: string): TeardownProvider {
  const client = new OpenAI({ apiKey, baseURL: BASE_URL });

  return {
    async analyze(site) {
      const { system, user } = buildPrompt(site);

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

      const parsed = parseTeardown(text);
      if (!parsed) {
        return { ok: false, reason: "We couldn't produce a useful teardown for that page. Try a different competitor URL." };
      }
      return { ok: true, result: { url: site.url, title: site.title, ...parsed, provider: "groq" } };
    },
  };
}
