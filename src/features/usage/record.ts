import type { SupabaseClient } from "@supabase/supabase-js";
import { costUsd, type TokenUsage } from "@/features/ai/pricing";

// Cost guardrails (SPEC.md §5 Phase 7). One place to tune them.
export const USAGE_CONFIG = {
  // Page-change classifications per store per UTC day; past this, changes wait
  // for tomorrow (the baseline isn't moved, so nothing is lost).
  maxAiCallsPerStorePerDay: Number(process.env.MAX_AI_CALLS_PER_STORE_PER_DAY) || 20,
};

export type AiFeature = "classify" | "briefing" | "meaning" | "match_classify" | "match_judge";

export type AiUsageRow = {
  feature: AiFeature;
  provider: "anthropic" | "groq";
  model: string;
  usage: TokenUsage;
  batch?: boolean;
  // Store-level work (classification) is shared by the store's followers;
  // user-level work (their briefing) is theirs alone.
  storeId?: string | null;
  userId?: string | null;
};

/** Log AI calls with tokens and cost. Best-effort: a logging failure never breaks the work. */
export async function recordAiUsage(service: SupabaseClient, rows: AiUsageRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await service.from("ai_usage").insert(
    rows.map((r) => ({
      feature: r.feature,
      provider: r.provider,
      model: r.model,
      store_id: r.storeId ?? null,
      user_id: r.userId ?? null,
      input_tokens: r.usage.inputTokens,
      output_tokens: r.usage.outputTokens,
      cache_read_tokens: r.usage.cacheReadTokens ?? 0,
      cache_write_tokens: r.usage.cacheWriteTokens ?? 0,
      batch: r.batch ?? false,
      cost_usd: costUsd(r.model, r.usage, { batch: r.batch }),
    })),
  );
  if (error) console.error(`Couldn't log AI usage: ${error.message}`);
}

/** Count outbound requests per store per day (catalog pages, watched pages). Best-effort. */
export async function recordFetches(
  service: SupabaseClient,
  storeId: string,
  kind: "catalog" | "page",
  requests: number,
): Promise<void> {
  if (requests <= 0) return;
  const { error } = await service.rpc("increment_fetch_log", { p_store_id: storeId, p_kind: kind, p_requests: requests });
  if (error) console.error(`Couldn't log fetches: ${error.message}`);
}

/** Tokens (in + out) the given features have used today (UTC), across all stores. */
export async function aiTokensToday(service: SupabaseClient, features: AiFeature[]): Promise<number> {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { data } = await service
    .from("ai_usage")
    .select("input_tokens, output_tokens")
    .in("feature", features)
    .gte("created_at", dayStart.toISOString());
  return (data ?? []).reduce((sum, r) => sum + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0);
}

/** How many AI calls of a kind a store has used today (UTC). */
export async function aiCallsToday(service: SupabaseClient, storeId: string, feature: AiFeature): Promise<number> {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count } = await service
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("feature", feature)
    .gte("created_at", dayStart.toISOString());
  return count ?? 0;
}
