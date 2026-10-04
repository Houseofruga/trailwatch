import type { SupabaseClient } from "@supabase/supabase-js";
import { resolvePlan } from "@/features/plan/comp";
import { PLANS } from "@/features/plan/limits";
import { evidenceLine, type Evidence, type OpportunityKind } from "./build";
import { OPPORTUNITIES_CONFIG as C } from "./config";

// Reads and status changes behind the Opportunities API (B4).

export type OpportunityView = {
  id: string;
  kind: OpportunityKind;
  score: number;
  noticed: string;
  action: string;
  evidence: Evidence;
  status: "open" | "dismissed" | "not_relevant";
  detectedAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  kind: OpportunityKind;
  score: number;
  noticed: string;
  action: string;
  evidence: Evidence;
  status: OpportunityView["status"];
  detected_at: string;
  updated_at: string;
};

const COLUMNS = "id, kind, score, noticed, action, evidence, status, detected_at, updated_at";
const toView = (r: Row): OpportunityView => ({
  id: r.id,
  kind: r.kind,
  score: r.score,
  noticed: r.noticed,
  action: r.action,
  evidence: r.evidence,
  status: r.status,
  detectedAt: r.detected_at,
  updatedAt: r.updated_at,
});

/** Whether the user's plan includes Opportunities (Pro, and everyone during the beta). */
export async function hasOpportunities(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await db.from("users").select("email, plan").eq("id", userId).single();
  return !!data && PLANS[resolvePlan(data.email, data.plan)].opportunities;
}

/** Open opportunities, strongest first (or every status, for a "dismissed" view). */
export async function listOpportunities(db: SupabaseClient, userId: string, opts: { all?: boolean; limit?: number } = {}): Promise<OpportunityView[]> {
  let q = db.from("opportunities").select(COLUMNS).eq("user_id", userId);
  if (!opts.all) q = q.eq("status", "open");
  const { data } = await q.order("score", { ascending: false }).limit(opts.limit ?? C.keepPerUser);
  return ((data ?? []) as Row[]).map(toView);
}

export async function getOpportunity(db: SupabaseClient, userId: string, id: string): Promise<OpportunityView | null> {
  const { data } = await db.from("opportunities").select(COLUMNS).eq("user_id", userId).eq("id", id).maybeSingle();
  return data ? toView(data as Row) : null;
}

export type StatusAction = "dismiss" | "not_relevant" | "restore";

/**
 * Dismiss (comes back only if the evidence gets much stronger), "not relevant
 * to me" (never comes back) or restore. Server-side, scoped to the user.
 */
export async function setOpportunityStatus(service: SupabaseClient, userId: string, id: string, action: StatusAction): Promise<boolean> {
  const { data: row } = await service.from("opportunities").select("score").eq("user_id", userId).eq("id", id).maybeSingle();
  if (!row) return false;
  const fields =
    action === "restore"
      ? { status: "open", dismissed_score: null }
      : { status: action === "dismiss" ? "dismissed" : "not_relevant", dismissed_score: row.score };
  const { error } = await service.from("opportunities").update(fields).eq("user_id", userId).eq("id", id);
  return !error;
}

export type BriefingOpportunity = { id: string; kind: OpportunityKind; noticed: string; evidence: string; action: string };

/** Up to three open opportunities for the Monday briefing, not repeated within a few weeks. */
export async function opportunitiesForBriefing(service: SupabaseClient, userId: string, now: Date): Promise<BriefingOpportunity[]> {
  const repeatAfter = new Date(now.getTime() - C.briefingRepeatDays * 86_400_000).toISOString();
  const { data } = await service
    .from("opportunities")
    .select("id, kind, noticed, action, evidence")
    .eq("user_id", userId)
    .eq("status", "open")
    .or(`briefed_at.is.null,briefed_at.lt.${repeatAfter}`)
    .order("score", { ascending: false })
    .limit(C.briefingItems);
  return (data ?? []).map((r) => ({ id: r.id, kind: r.kind, noticed: r.noticed, evidence: evidenceLine(r.evidence as Evidence), action: r.action }));
}

export async function markBriefed(service: SupabaseClient, ids: string[], now: Date): Promise<void> {
  if (ids.length) await service.from("opportunities").update({ briefed_at: now.toISOString() }).in("id", ids);
}
