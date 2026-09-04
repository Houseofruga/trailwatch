import Anthropic from "@anthropic-ai/sdk";
import { buildFinderPrompt, parseCompetitors } from "./prompt";
import type { FinderProvider } from "./types";

// Same cheap/fast tier as the teardown and change summarizer.
const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 500;

export function createAnthropicFinder(apiKey: string): FinderProvider {
  const client = new Anthropic({ apiKey });

  return {
    async suggest({ company, groundingText }) {
      const { system, user } = buildFinderPrompt(company, groundingText);

      try {
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system,
          messages: [{ role: "user", content: user }],
        });

        const text = response.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join(" ")
          .trim();

        const competitors = parseCompetitors(text);
        if (!competitors) {
          return {
            ok: false,
            reason: "We couldn't find competitors for that — add them yourself below.",
          };
        }
        return { ok: true, result: { company, competitors, provider: "anthropic" } };
      } catch {
        return {
          ok: false,
          reason: "We couldn't find competitors for that — add them yourself below.",
        };
      }
    },
  };
}
