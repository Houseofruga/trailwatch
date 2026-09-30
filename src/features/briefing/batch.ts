import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_SMART_MODEL } from "@/features/ai/models";
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

export type BatchOutcome =
  | { status: "in_progress" }
  | {
      status: "ended";
      // Per briefing id: the parsed interpretation, or why there isn't one.
      results: Map<string, { ok: true; interpretation: BriefingInterpretation } | { ok: false; reason: string }>;
    };

export async function collectBriefingBatch(batchId: string): Promise<BatchOutcome> {
  const anthropic = client();
  if (!anthropic) throw new Error("ANTHROPIC_API_KEY is not set.");
  const batch = await anthropic.messages.batches.retrieve(batchId);
  if (batch.processing_status !== "ended") return { status: "in_progress" };

  const results = new Map<string, { ok: true; interpretation: BriefingInterpretation } | { ok: false; reason: string }>();
  for await (const entry of await anthropic.messages.batches.results(batchId)) {
    if (entry.result.type !== "succeeded") {
      results.set(entry.custom_id, { ok: false, reason: `batch request ${entry.result.type}` });
      continue;
    }
    const text = entry.result.message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    const interpretation = parseInterpretation(text);
    results.set(
      entry.custom_id,
      interpretation ? { ok: true, interpretation } : { ok: false, reason: "unparseable model reply" },
    );
  }
  return { status: "ended", results };
}
