import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { buildPagePrompt, parsePageProfile } from "./prompt";
import type { InsightProvider } from "./types";

// Same provider seam as summaries/competitorTeardown: Groq (free tier) preferred,
// then Anthropic Haiku, then a null provider that declines cleanly. The single
// swap point is getInsightProvider().
const GROQ_MODEL = "openai/gpt-oss-20b";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const ANTHROPIC_MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 700;
const DECLINE = "We couldn't profile that page.";

// gpt-oss-20b is a reasoning model: without a low reasoning effort it spends the
// token budget thinking and truncates the JSON (same fix as summaries/groq.ts).
function createGroq(apiKey: string): InsightProvider {
  const client = new OpenAI({ apiKey, baseURL: GROQ_BASE_URL });
  return {
    async analyzePage(input) {
      const { system, user } = buildPagePrompt(input);
      const response = await client.chat.completions.create({
        model: GROQ_MODEL,
        max_tokens: MAX_TOKENS,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      const text = (response.choices[0]?.message?.content ?? "").trim();
      const parsed = parsePageProfile(text);
      if (!parsed) return { ok: false, reason: DECLINE };
      return { ok: true, profile: parsed, provider: "groq" };
    },
  };
}

function createAnthropic(apiKey: string): InsightProvider {
  const client = new Anthropic({ apiKey });
  return {
    async analyzePage(input) {
      const { system, user } = buildPagePrompt(input);
      const response = await client.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: "user", content: user }],
      });
      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join(" ")
        .trim();
      const parsed = parsePageProfile(text);
      if (!parsed) return { ok: false, reason: DECLINE };
      return { ok: true, profile: parsed, provider: "anthropic" };
    },
  };
}

const nullProvider: InsightProvider = {
  async analyzePage() {
    return { ok: false, reason: "No model provider is configured." };
  },
};

export function getInsightProvider(): InsightProvider {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) return createGroq(groqKey);

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) return createAnthropic(anthropicKey);

  return nullProvider;
}
