import type { SupabaseClient } from "@supabase/supabase-js";

export type UserCost = { userId: string; direct: number; shared: number; total: number };

/**
 * Cost per user (pure). A user's own AI work (their briefing) is theirs; a
 * store's AI work (page classification) is crawled once for everyone, so it's
 * split evenly across the users who follow that store. Store cost with no
 * followers is reported as unallocated.
 */
export function allocateCosts(input: {
  userCosts: { userId: string; cost: number }[];
  storeCosts: { storeId: string; cost: number }[];
  follows: { userId: string; storeId: string }[];
}): { users: UserCost[]; unallocated: number } {
  const byUser = new Map<string, UserCost>();
  const row = (userId: string) => {
    let r = byUser.get(userId);
    if (!r) byUser.set(userId, (r = { userId, direct: 0, shared: 0, total: 0 }));
    return r;
  };

  for (const { userId, cost } of input.userCosts) row(userId).direct += cost;

  const followers = new Map<string, string[]>();
  for (const { userId, storeId } of input.follows) followers.set(storeId, [...(followers.get(storeId) ?? []), userId]);

  let unallocated = 0;
  for (const { storeId, cost } of input.storeCosts) {
    const users = followers.get(storeId) ?? [];
    if (users.length === 0) {
      unallocated += cost;
      continue;
    }
    for (const userId of users) row(userId).shared += cost / users.length;
  }

  const users = [...byUser.values()]
    .map((r) => ({ ...r, total: r.direct + r.shared }))
    .sort((a, b) => b.total - a.total);
  return { users, unallocated };
}

export type MonthlyReport = {
  month: string; // YYYY-MM
  totalCost: number;
  unallocated: number;
  aiCalls: number;
  users: (UserCost & { email: string; plan: string; competitors: number })[];
  stores: { storeId: string; domain: string; followers: number; aiCalls: number; cost: number; requests: number }[];
};

/** Month bounds (UTC) for "YYYY-MM"; defaults to the current month. */
export function monthRange(month?: string, now: Date = new Date()): { month: string; start: string; end: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(month ?? "");
  const year = m ? Number(m[1]) : now.getUTCFullYear();
  const mon = m ? Number(m[2]) - 1 : now.getUTCMonth();
  const start = new Date(Date.UTC(year, mon, 1));
  const end = new Date(Date.UTC(year, mon + 1, 1));
  return { month: start.toISOString().slice(0, 7), start: start.toISOString(), end: end.toISOString() };
}

const ROW_LIMIT = 50_000;

/** The admin view's data (service role): cost per user and per store for a month. */
export async function getMonthlyReport(service: SupabaseClient, month?: string): Promise<MonthlyReport> {
  const range = monthRange(month);
  const [usage, follows, users, stores, fetches] = await Promise.all([
    service
      .from("ai_usage")
      .select("user_id, store_id, cost_usd")
      .gte("created_at", range.start)
      .lt("created_at", range.end)
      .limit(ROW_LIMIT),
    service.from("competitors").select("user_id, store_id").not("store_id", "is", null),
    service.from("users").select("id, email, plan"),
    service.from("stores").select("id, domain"),
    service.from("fetch_log").select("store_id, requests").gte("day", range.start.slice(0, 10)).lt("day", range.end.slice(0, 10)),
  ]);
  for (const r of [usage, follows, users, stores, fetches]) if (r.error) throw new Error(r.error.message);

  const userCosts: { userId: string; cost: number }[] = [];
  const storeCost = new Map<string, { cost: number; calls: number }>();
  for (const u of usage.data ?? []) {
    const cost = Number(u.cost_usd) || 0;
    if (u.user_id) userCosts.push({ userId: u.user_id, cost });
    else if (u.store_id) {
      const s = storeCost.get(u.store_id) ?? { cost: 0, calls: 0 };
      storeCost.set(u.store_id, { cost: s.cost + cost, calls: s.calls + 1 });
    }
  }
  const followRows = (follows.data ?? []).map((f) => ({ userId: f.user_id as string, storeId: f.store_id as string }));
  const { users: allocated, unallocated } = allocateCosts({
    userCosts,
    storeCosts: [...storeCost.entries()].map(([storeId, s]) => ({ storeId, cost: s.cost })),
    follows: followRows,
  });

  const userInfo = new Map((users.data ?? []).map((u) => [u.id, u]));
  const competitorsOf = (userId: string) => followRows.filter((f) => f.userId === userId).length;
  const requests = new Map<string, number>();
  for (const f of fetches.data ?? []) requests.set(f.store_id, (requests.get(f.store_id) ?? 0) + f.requests);

  return {
    month: range.month,
    totalCost: (usage.data ?? []).reduce((sum, u) => sum + (Number(u.cost_usd) || 0), 0),
    unallocated,
    aiCalls: usage.data?.length ?? 0,
    users: allocated.map((a) => ({
      ...a,
      email: userInfo.get(a.userId)?.email ?? a.userId,
      plan: userInfo.get(a.userId)?.plan ?? "?",
      competitors: competitorsOf(a.userId),
    })),
    stores: (stores.data ?? [])
      .map((s) => ({
        storeId: s.id,
        domain: s.domain,
        followers: followRows.filter((f) => f.storeId === s.id).length,
        aiCalls: storeCost.get(s.id)?.calls ?? 0,
        cost: storeCost.get(s.id)?.cost ?? 0,
        requests: requests.get(s.id) ?? 0,
      }))
      .filter((s) => s.followers > 0 || s.cost > 0 || s.requests > 0)
      .sort((a, b) => b.cost - a.cost || b.requests - a.requests),
  };
}

/** Admins: comma-separated ADMIN_EMAILS, read at call time (same shape as COMP_EMAILS). */
export function isAdminEmail(email: string | null | undefined): boolean {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && admins.includes(email.toLowerCase());
}
