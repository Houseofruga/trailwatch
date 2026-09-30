import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_SMART_MODEL } from "@/features/ai/models";
import type { TokenUsage } from "@/features/ai/pricing";
import { parseInterpretation, type BriefingInput, type BriefingInterpretation } from "./content";
import { BRIEFING_SYSTEM, buildBriefingMessage } from "./prompt";

const MAX_TOKENS = 1200;

function client(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  return key ? new Anthropic({ apiKey: key }) : null;
}

export function batchAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Submit many users' briefings as one Message Batch (non-urgent → 50% cheaper).
 * custom_id is the briefing row id. The fixed system prompt is marked for
 * prompt caching; only the per-user event list varies.
 */
export async function submitBriefingBatch(items: { briefingId: string; input: BriefingInput }[]): Promise<string> {
  const anthropic = client();
  if (!anthropic) throw new Error("ANTHROPIC_API_KEY is not set.");
  const batch = await anthropic.messages.batches.create({
    requests: items.map(({ briefingId, input }) => ({
      custom_id: briefingId,
      params: {
        model: ANTHROPIC_SMART_MODEL,
        max_tokens: MAX_TOKENS,
        system: [{ type: "text", text: BRIEFING_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: buildBriefingMessage(input) }],
      },
    })),
  });
  return batch.id;
}

// Per briefing id: the parsed interpretation (or why there isn't one), and
// what the request consumed (Phase 7 cost tracking).
export type BatchEntry =
  | { ok: true; interpretation: BriefingInterpretation; usage: TokenUsage }
  | { ok: false; reason: string; usage?: TokenUsage };

export type BatchOutcome = { status: "in_progress" } | { status: "ended"; results: Map<string, BatchEntry> };

export const BRIEFING_MODEL = ANTHROPIC_SMART_MODEL;

export async function collectBriefingBatch(batchId: string): Promise<BatchOutcome> {
  const anthropic = client();
  if (!anthropic) throw new Error("ANTHROPIC_API_KEY is not set.");
  const batch = await anthropic.messages.batches.retrieve(batchId);
  if (batch.processing_status !== "ended") return { status: "in_progress" };

  const results = new Map<string, BatchEntry>();
  for await (const entry of await anthropic.messages.batches.results(batchId)) {
    if (entry.result.type !== "succeeded") {
      results.set(entry.custom_id, { ok: false, reason: `batch request ${entry.result.type}` });
      continue;
    }
    const text = entry.result.message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    const u = entry.result.message.usage;
    const usage: TokenUsage = {
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      cacheReadTokens: u.cache_read_input_tokens ?? 0,
      cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
    };
    const interpretation = parseInterpretation(text);
    results.set(
      entry.custom_id,
      interpretation ? { ok: true, interpretation, usage } : { ok: false, reason: "unparseable model reply", usage },
    );
  }
  return { status: "ended", results };
}
