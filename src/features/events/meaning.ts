// "What it means" for high-priority moves (DESIGN_TO_COMPONENTS.md D2): one
// short interpretation per event, written once per store event and shared by
// every follower. Shown on the competitor timeline and in instant alerts.

import type { SupabaseClient } from "@supabase/supabase-js";
import { callFastModel } from "@/features/ai/fastModel";
import { describeEvent } from "@/features/alerts/describe";
import { aiCallsToday, recordAiUsage, USAGE_CONFIG } from "@/features/usage/record";
import type { EventType } from "./types";

export type MeaningEvent = { id: string; type: EventType; payload: Record<string, unknown> };
export type RecentEvent = { type: EventType; title: string | null; detectedAt: string };

export const MEANING_SYSTEM = `You explain a competitor's move to the founder of a US direct-to-consumer brand, in one glance.

For each numbered move, write what it likely MEANS, not what happened (they can already see what happened) and not advice (that is shown separately).
- One or two short sentences, at most 30 words in total.
- Ground it in the facts given: the move itself and the store's recent history. Point out patterns ("their third throw this month"), timing (season, holidays) or intent (clearance vs. a real price cut) when the facts support it.
- Plain, calm, specific. No hype, no hedging words like "may" or "might" unless the facts are genuinely unclear. No emoji, no markdown.

Reply with ONLY a JSON object: {"meanings": ["...", "..."]}, one string per move, in the same order.`;

const title = (payload: Record<string, unknown>) =>
  typeof payload.title === "string" && payload.title.trim() ? payload.title.trim() : null;

export function buildMeaningPrompt(input: {
  storeName: string;
  today: string;
  events: MeaningEvent[];
  recent: RecentEvent[];
}): { system: string; user: string } {
  const moves = input.events.map((e, i) => `${i + 1}. ${describeEvent(e.type, e.payload, input.storeName)}`).join("\n");
  const history = input.recent.length
    ? input.recent.map((r) => `- ${r.detectedAt.slice(0, 10)} ${r.type.replace(/_/g, " ")}${r.title ? `: ${r.title}` : ""}`).join("\n")
    : "- (nothing recorded yet)";
  return {
    system: MEANING_SYSTEM,
    user: `Store: ${input.storeName}\nToday: ${input.today}\n\nNew moves:\n${moves}\n\nTheir moves in the last 30 days:\n${history}`,
  };
}

export function parseMeanings(text: string, expected: number): string[] | null {
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try {
    const parsed = JSON.parse(json) as { meanings?: unknown };
    if (!Array.isArray(parsed.meanings) || parsed.meanings.length !== expected) return null;
    const out = parsed.meanings.map((m) => (typeof m === "string" ? m.trim().replace(/\s+/g, " ") : ""));
    return out.every((m) => m.length > 0 && m.length <= 280) ? out : null;
  } catch {
    return null;
  }
}

// At most this many moves share one call (a burst of launches is one bundle anyway).
const MAX_PER_CALL = 8;

/**
 * Write meanings for a store's new high-priority events: one model call per
 * batch, within the store's daily AI cap. Best-effort — a failure leaves the
 * events without a meaning; the UI then shows none.
 */
export async function writeMeanings(service: SupabaseClient, storeId: string, events: MeaningEvent[]): Promise<void> {
  if (events.length === 0) return;
  try {
    const used = await aiCallsToday(service, storeId, "meaning");
    if (used >= USAGE_CONFIG.maxAiCallsPerStorePerDay) return;

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: store }, { data: recent }] = await Promise.all([
      service.from("stores").select("name").eq("id", storeId).maybeSingle(),
      service
        .from("events")
        .select("type, payload, detected_at")
        .eq("store_id", storeId)
        .is("for_user_id", null)
        .neq("severity", "low")
        .gte("detected_at", since)
        .not("id", "in", `(${events.map((e) => e.id).join(",")})`)
        .order("detected_at", { ascending: false })
        .limit(40),
    ]);

    const batch = events.slice(0, MAX_PER_CALL);
    const { system, user } = buildMeaningPrompt({
      storeName: store?.name ?? "This competitor",
      today: new Date().toISOString().slice(0, 10),
      events: batch,
      recent: (recent ?? []).map((r) => ({
        type: r.type as EventType,
        title: title(r.payload as Record<string, unknown>),
        detectedAt: r.detected_at,
      })),
    });
    const reply = await callFastModel(system, user, 120 * batch.length);
    if (!reply) return;
    await recordAiUsage(service, [{ feature: "meaning", storeId, ...reply.call }]);
    const meanings = parseMeanings(reply.text, batch.length);
    if (!meanings) return;
    await Promise.all(batch.map((e, i) => service.from("events").update({ meaning: meanings[i] }).eq("id", e.id)));
  } catch (err) {
    console.warn(`Couldn't write meanings for store ${storeId}:`, err instanceof Error ? err.message : err);
  }
}
