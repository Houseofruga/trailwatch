import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ANTHROPIC_FAST_MODEL, GROQ_BASE_URL, GROQ_SMALL_MODEL } from "./models";
import type { TokenUsage } from "./pricing";

// What a model call consumed, for cost tracking (Phase 7). Present whenever a
// call was made — including one whose reply didn't parse.
export type ModelCall = { provider: "anthropic" | "groq"; model: string; usage: TokenUsage };

export type FastReply = { text: string; call: ModelCall };

/**
 * One short call to the fast model: Claude Haiku, or Groq when no Anthropic
 * key is set (legacy fallback). Replies are expected as a JSON object.
 * Null when no provider is configured.
 */
export async function callFastModel(
  system: string,
  user: string,
  maxTokens: number,
  groqModel: string = GROQ_SMALL_MODEL,
): Promise<FastReply | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  if (anthropicKey) {
    const response = await new Anthropic({ apiKey: anthropicKey }).messages.create({
      model: ANTHROPIC_FAST_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const u = response.usage;
    return {
      text: response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join(""),
      call: {
        provider: "anthropic",
        model: ANTHROPIC_FAST_MODEL,
        usage: {
          inputTokens: u.input_tokens,
          outputTokens: u.output_tokens,
          cacheReadTokens: u.cache_read_input_tokens ?? 0,
          cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
        },
      },
    };
  }
  if (groqKey) {
    const gptOss = groqModel.startsWith("openai/gpt-oss");
    const response = await new OpenAI({ apiKey: groqKey, baseURL: GROQ_BASE_URL }).chat.completions.create({
      model: groqModel,
      // gpt-oss always reasons: keep effort low and leave headroom (see
      // summaries/groq.ts). Other models answer directly with reasoning off.
      reasoning_effort: gptOss ? "low" : "none",
      // Other free-tier models cap output at 1,000 tokens a minute; a larger
      // max_tokens is refused outright.
      max_tokens: gptOss ? Math.max(800, maxTokens * 3) : Math.min(1000, Math.max(400, Math.ceil(maxTokens * 1.5))),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return {
      // gpt-oss likes non-breaking hyphens (U+2011), which some mail fonts lack.
      text: (response.choices[0]?.message?.content ?? "").replace(/[‐‑]/g, "-"),
      call: {
        provider: "groq",
        model: groqModel,
        usage: { inputTokens: response.usage?.prompt_tokens ?? 0, outputTokens: response.usage?.completion_tokens ?? 0 },
      },
    };
  }
  return null;
}
