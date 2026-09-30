// The single place model IDs live. Every provider file imports from here, so a
// model swap is a one-line change. Verify IDs against the provider docs before
// changing them.

// Anthropic — cheap/fast tier: change summaries, page classification, teardowns.
export const ANTHROPIC_FAST_MODEL = "claude-haiku-4-5";
// Anthropic — stronger tier: the weekly briefing (pivot Phase 4, via the Batch API).
export const ANTHROPIC_SMART_MODEL = "claude-sonnet-5";

// Groq (OpenAI-compatible endpoint, free tier) — the legacy preferred provider.
export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
// Small reasoning model: summaries, insights, teardowns.
export const GROQ_SMALL_MODEL = "openai/gpt-oss-20b";
// Larger model: competitor finder recall (see competitorFinder/groq.ts for why).
export const GROQ_LARGE_MODEL = "openai/gpt-oss-120b";
