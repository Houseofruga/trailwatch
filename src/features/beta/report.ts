import type { SupabaseClient } from "@supabase/supabase-js";
import { foundingOffer } from "./offer";

// The admin page's Beta section: founding members and their calls, ratings,
// and the latest feedback.

export type BetaMember = { id: string; email: string; founding: boolean; calls: number; discountPct: number; signedUp: string };
export type RatingSummary = { target: "briefing" | "alert"; useful: number; notUseful: number };
export type BetaNote = { kind: string; email: string; message: string; at: string };

export type BetaReport = {
  foundingUsed: number;
  foundingCap: number;
  members: BetaMember[];
  ratings: RatingSummary[];
  /** Feedback and rating comments, newest first. */
  notes: BetaNote[];
};

/** Pure: useful / not useful counts per target type. */
export function summarizeRatings(rows: { target_type: string; value: string }[]): RatingSummary[] {
  return (["briefing", "alert"] as const).map((target) => ({
    target,
    useful: rows.filter((r) => r.target_type === target && r.value === "useful").length,
    notUseful: rows.filter((r) => r.target_type === target && r.value === "not_useful").length,
  }));
}

export async function getBetaReport(service: SupabaseClient): Promise<BetaReport> {
  const [users, cap, ratings, feedback] = await Promise.all([
    service.from("users").select("id, email, is_founding_member, founder_calls, created_at").order("created_at", { ascending: true }).limit(500),
    service.from("app_settings").select("value").eq("key", "founding_member_cap").maybeSingle(),
    service.from("ratings").select("target_type, value, comment, updated_at, users(email)").order("updated_at", { ascending: false }).limit(1000),
    service.from("feedback").select("kind, message, created_at, users(email)").order("created_at", { ascending: false }).limit(50),
  ]);
  if (users.error) throw new Error(users.error.message);
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
  const members = (users.data ?? []).map((u) => ({
    id: u.id as string,
    email: u.email as string,
    founding: !!u.is_founding_member,
    calls: (u.founder_calls as number | null) ?? 0,
    discountPct: foundingOffer(!!u.is_founding_member, (u.founder_calls as number | null) ?? 0).discountPct,
    signedUp: u.created_at as string,
  }));
  type Rated = { target_type: string; value: string; comment: string | null; updated_at: string; users: { email: string } | { email: string }[] | null };
  type Fed = { kind: string; message: string; created_at: string; users: { email: string } | { email: string }[] | null };
  const rated = (ratings.data ?? []) as Rated[];
  const notes: BetaNote[] = [
    ...((feedback.data ?? []) as Fed[]).map((f) => ({ kind: f.kind === "feature" ? "Feature request" : "Feedback", email: one(f.users)?.email ?? "", message: f.message, at: f.created_at })),
    ...rated
      .filter((r) => r.comment)
      .map((r) => ({
        kind: `${r.target_type === "briefing" ? "Briefing" : "Alert"}: ${r.value === "useful" ? "useful" : "not useful"}`,
        email: one(r.users)?.email ?? "",
        message: r.comment!,
        at: r.updated_at,
      })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 50);
  return {
    foundingUsed: members.filter((m) => m.founding).length,
    foundingCap: Number(cap.data?.value ?? 25),
    members,
    ratings: summarizeRatings(rated),
    notes,
  };
}
