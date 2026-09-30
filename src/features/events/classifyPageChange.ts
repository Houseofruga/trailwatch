import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ANTHROPIC_FAST_MODEL, GROQ_BASE_URL, GROQ_SMALL_MODEL } from "@/features/ai/models";
import { buildClassifierPrompt, parseClassification, type Classification, type ClassifyInput } from "./classifyPrompt";

export type ClassifyResult = { ok: true; classification: Classification } | { ok: false; reason: string };

const MAX_TOKENS = 300;

async function withAnthropic(apiKey: string, input: ClassifyInput): Promise<string> {
  const { system, user } = buildClassifierPrompt(input);
  const response = await new Anthropic({ apiKey }).messages.create({
    model: ANTHROPIC_FAST_MODEL,
    max_tokens: MAX_TOKENS,
    system,
    messages: [{ role: "user", content: user }],
  });
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

async function withGroq(apiKey: string, input: ClassifyInput): Promise<string> {
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
  return response.choices[0]?.message?.content ?? "";
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
    const text = anthropicKey ? await withAnthropic(anthropicKey, input) : await withGroq(groqKey!, input);
    const classification = parseClassification(text);
    return classification ? { ok: true, classification } : { ok: false, reason: "unparseable model reply" };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
