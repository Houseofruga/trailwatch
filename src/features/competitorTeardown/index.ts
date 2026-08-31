import { createAnthropicTeardown } from "./anthropic";
import { createGroqTeardown } from "./groq";
import type { TeardownProvider } from "./types";

export type { TeardownResult, PricingTier } from "./types";

// Declines cleanly when no provider key is set, so local dev / preview without a
// key shows a friendly message instead of throwing.
const nullProvider: TeardownProvider = {
  async analyze() {
    return { ok: false, reason: "The AI teardown isn't available in this environment yet — no model provider is configured." };
  },
};

// Same swap point as the change summarizer: Groq (free tier) preferred, then
// Anthropic Haiku, then the null provider.
export function getTeardownProvider(): TeardownProvider {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) return createGroqTeardown(groqKey);

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) return createAnthropicTeardown(anthropicKey);

  return nullProvider;
}
