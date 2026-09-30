import { callFastModel, type ModelCall } from "@/features/ai/fastModel";
import { buildClassifierPrompt, parseClassification, type Classification, type ClassifyInput } from "./classifyPrompt";

export type { ModelCall } from "@/features/ai/fastModel";

export type ClassifyResult =
  | { ok: true; classification: Classification; call: ModelCall }
  | { ok: false; reason: string; call?: ModelCall };

const MAX_TOKENS = 300;

/**
 * Classify a meaningful page change (SPEC.md §5 Phase 3). Claude Haiku per the
 * spec; Groq is the legacy fallback when no Anthropic key is set. Only called
 * after the hash and the noise filter both say the page really changed, so an
 * unchanged page never costs an AI call.
 */
export async function classifyPageChange(input: ClassifyInput): Promise<ClassifyResult> {
  try {
    const { system, user } = buildClassifierPrompt(input);
    const reply = await callFastModel(system, user, MAX_TOKENS);
    if (!reply) return { ok: false, reason: "no model provider configured" };
    const classification = parseClassification(reply.text);
    return classification
      ? { ok: true, classification, call: reply.call }
      : { ok: false, reason: "unparseable model reply", call: reply.call };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
