import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt, NO_CHANGE_SENTINEL } from "./prompt";
import type { Summarizer } from "./types";

// Cheapest/fastest tier per SPEC.md — summaries are short and mechanical.
const MODEL = "claude-haiku-4-5";

export function createAnthropicSummarizer(apiKey: string): Summarizer {
  const client = new Anthropic({ apiKey });

  return {
    async summarize(input) {
      const { system, user } = buildPrompt(input);

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 256,
        system,
        messages: [{ role: "user", content: user }],
      });

      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join(" ")
        .trim();

      if (!text || text === NO_CHANGE_SENTINEL) {
        return { skipped: true, reason: "model judged the change trivial" };
      }
      return { summary: text };
    },
  };
}
