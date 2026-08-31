import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt, parseTeardown } from "./prompt";
import type { TeardownProvider } from "./types";

// Same cheap/fast tier as the change summarizer. The teardown is a bit longer,
// so allow more tokens than the 256 used for diffs.
const MODEL = "claude-haiku-4-5";
const MAX_TOKENS = 700;

export function createAnthropicTeardown(apiKey: string): TeardownProvider {
  const client = new Anthropic({ apiKey });

  return {
    async analyze(site) {
      const { system, user } = buildPrompt(site);

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

      const parsed = parseTeardown(text);
      if (!parsed) {
        return { ok: false, reason: "We couldn't produce a useful teardown for that page. Try a different competitor URL." };
      }
      return { ok: true, result: { url: site.url, title: site.title, ...parsed, provider: "anthropic" } };
    },
  };
}
