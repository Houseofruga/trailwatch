import { createAnthropicSummarizer } from "./anthropic";
import { createGroqSummarizer } from "./groq";
import type { Summarizer } from "./types";

export type { Summarizer, SummaryInput, SummaryResult } from "./types";

// Always declines — used when no provider is configured, so local dev /
// preview without a key records changes (summary null) instead of throwing.
const nullSummarizer: Summarizer = {
  async summarize() {
    return { skipped: true, reason: "summarization not configured (no provider key)" };
  },
};

// The single swap point. Groq (free tier, GPT-OSS-20B) is preferred when its
// key is present; Anthropic Haiku is the fallback. Adding another provider is
// a new file plus a branch here — the check engine never changes.
export function getSummarizer(): Summarizer {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) return createGroqSummarizer(groqKey);

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) return createAnthropicSummarizer(anthropicKey);

  return nullSummarizer;
}
