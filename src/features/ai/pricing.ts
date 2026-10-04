import { ANTHROPIC_FAST_MODEL, ANTHROPIC_SMART_MODEL, GROQ_LARGE_MODEL, GROQ_SMALL_MODEL } from "./models";

// List prices in USD per 1M tokens, for cost tracking (pivot Phase 7) — not
// billing. VERIFY against the providers' pricing pages when a model changes:
// Anthropic (anthropic.com/pricing) and Groq (groq.com/pricing). Groq's free
// tier actually costs $0; list price is logged so the admin view shows what
// usage would cost at paid rates. GROQ_MATCH_MODEL has no listed price yet, so
// its calls log tokens at $0.
export const MODEL_PRICES: Record<string, { input: number; output: number }> = {
  [ANTHROPIC_FAST_MODEL]: { input: 1, output: 5 },
  [ANTHROPIC_SMART_MODEL]: { input: 3, output: 15 },
  [GROQ_SMALL_MODEL]: { input: 0.075, output: 0.3 },
  [GROQ_LARGE_MODEL]: { input: 0.15, output: 0.6 },
};

// Anthropic multipliers on the input price: prompt-cache reads are 10%, cache
// writes 125%. The Batch API halves everything.
const CACHE_READ = 0.1;
const CACHE_WRITE = 1.25;
const BATCH = 0.5;

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
};

/** Cost of one call in USD. Unknown models cost 0 (and are visible as such in admin). */
export function costUsd(model: string, usage: TokenUsage, opts: { batch?: boolean } = {}): number {
  const price = MODEL_PRICES[model];
  if (!price) return 0;
  const perToken = (perMillion: number) => perMillion / 1_000_000;
  const cost =
    usage.inputTokens * perToken(price.input) +
    (usage.cacheReadTokens ?? 0) * perToken(price.input) * CACHE_READ +
    (usage.cacheWriteTokens ?? 0) * perToken(price.input) * CACHE_WRITE +
    usage.outputTokens * perToken(price.output);
  return (opts.batch ? cost * BATCH : cost);
}
