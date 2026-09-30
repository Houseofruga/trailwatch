import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ANTHROPIC_FAST_MODEL, GROQ_BASE_URL, GROQ_SMALL_MODEL } from "@/features/ai/models";
import type { TokenUsage } from "@/features/ai/pricing";
import { buildClassifierPrompt, parseClassification, type Classification, type ClassifyInput } from "./classifyPrompt";

// What a model call consumed, for cost tracking (Phase 7). Present whenever a
// call was made — including one whose reply didn't parse.
export type ModelCall = { provider: "anthropic" | "groq"; model: string; usage: TokenUsage };

export type ClassifyResult =
  | { ok: true; classification: Classification; call: ModelCall }
  | { ok: false; reason: string; call?: ModelCall };

type Reply = { text: string; call: ModelCall };

const MAX_TOKENS = 300;

async function withAnthropic(apiKey: string, input: ClassifyInput): Promise<Reply> {
  const { system, user } = buildClassifierPrompt(input);
  const response = await new Anthropic({ apiKey }).messages.create({
    model: ANTHROPIC_FAST_MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  const u = response.usage;
  return {
    text,
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

async function withGroq(apiKey: string, input: ClassifyInput): Promise<Reply> {
  const { system, user } = buildClassifierPrompt(input);
  const response = await new OpenAI({ apiKey, baseURL: GROQ_BASE_URL }).chat.completions.create({
    model: GROQ_SMALL_MODEL,
    // Reasoning model: keep effort low and leave headroom (see summaries/groq.ts).
    reasoning_effort: "low",
    max_tokens: 800,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return {
    text: response.choices[0]?.message?.content ?? "",
    call: {
      provider: "groq",
      model: GROQ_SMALL_MODEL,
      usage: { inputTokens: response.usage?.prompt_tokens ?? 0, outputTokens: response.usage?.completion_tokens ?? 0 },
    },
  };
}

/**
 * Classify a meaningful page change (SPEC.md §5 Phase 3). Claude Haiku per the
 * spec; Groq is the legacy fallback when no Anthropic key is set. Only called
 * after the hash and the noise filter both say the page really changed, so an
 * unchanged page never costs an AI call.
 */
export async function classifyPageChange(input: ClassifyInput): Promise<ClassifyResult> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  if (!anthropicKey && !groqKey) return { ok: false, reason: "no model provider configured" };

  try {
    const { text, call } = anthropicKey ? await withAnthropic(anthropicKey, input) : await withGroq(groqKey!, input);
    const classification = parseClassification(text);
    return classification ? { ok: true, classification, call } : { ok: false, reason: "unparseable model reply", call };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
