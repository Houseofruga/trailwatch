import { createAnthropicFinder } from "./anthropic";
import { createGroqFinder } from "./groq";
import type { FinderProvider } from "./types";

export type { Competitor, FinderResult } from "./types";

// Declines cleanly when no provider key is set — the UI then falls back to
// manual competitor entry instead of throwing.
const nullProvider: FinderProvider = {
  async suggest() {
    return {
      ok: false,
      reason: "Suggestions aren't available here yet — add your competitors below.",
    };
  },
};

// Same swap point as the teardown / change summarizer: Groq (free tier) first,
// then Anthropic Haiku, then the null provider.
export function getFinderProvider(): FinderProvider {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) return createGroqFinder(groqKey);

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) return createAnthropicFinder(anthropicKey);

  return nullProvider;
}
