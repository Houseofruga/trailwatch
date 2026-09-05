import { createGeminiFinder } from "./gemini";
import { createAnthropicFinder } from "./anthropic";
import { createGroqFinder } from "./groq";
import type { FinderOutcome, FinderProvider } from "./types";

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

// The provider chain, best-first: Gemini with **live Google Search grounding**
// (most current), then Groq's offline finder (recency/region-guarded prompt),
// then Anthropic Haiku. `GEMINI_API_KEY` is optional — leave it unset and the
// finder behaves exactly as before (Groq → Anthropic). Keep the Gemini project
// on the free tier (no billing) so its 500/day grounding cap hard-stops at 429
// rather than charging; the chain then falls through to Groq for that day.
function providerChain(): FinderProvider[] {
  const chain: FinderProvider[] = [];
  if (process.env.GEMINI_API_KEY) chain.push(createGeminiFinder(process.env.GEMINI_API_KEY));
  if (process.env.GROQ_API_KEY) chain.push(createGroqFinder(process.env.GROQ_API_KEY));
  if (process.env.ANTHROPIC_API_KEY) chain.push(createAnthropicFinder(process.env.ANTHROPIC_API_KEY));
  return chain;
}

export function getFinderProvider(): FinderProvider {
  const chain = providerChain();
  if (chain.length === 0) return nullProvider;
  if (chain.length === 1) return chain[0];

  // Try each in order; the first ok result wins. A provider that errors or
  // declines (incl. Gemini hitting its free daily cap) falls through to the
  // next, so a grounded result is preferred but never required.
  return {
    async suggest(input) {
      let last: FinderOutcome = { ok: false, reason: "We couldn't find competitors for that." };
      for (const provider of chain) {
        const outcome = await provider.suggest(input);
        if (outcome.ok) return outcome;
        last = outcome;
      }
      return last;
    },
  };
}
