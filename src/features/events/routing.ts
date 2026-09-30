import { PLANS, type Plan } from "@/features/plan/limits";
import type { EventType, Severity } from "./types";

// Delivery knobs (SPEC.md §5 Phase 3). Read at call time so an env change
// needs no rebuild.
export function routingConfig() {
  return {
    // Max instant alerts (bundles) per user per day; the rest go to the briefing.
    alertsPerUserPerDay: Number(process.env.ALERTS_PER_USER_PER_DAY) || 5,
    // Hold a store's alert this long after its newest event, so a burst (a
    // catalog check plus page checks, or back-to-back ticks) becomes one alert.
    bundleHoldMinutes: 10,
    // The same news (same store, type, product/page) isn't alerted twice within this.
    dedupeWindowHours: 24,
  };
}

export type Delivery = "instant" | "briefing";

/**
 * Where an event goes for one follower. Low severity is stored only. Instant
 * alerts are a plan feature (Starter and up); everyone else gets high events
 * in the briefing.
 */
export function deliveryFor(severity: Severity, plan: Plan): Delivery | null {
  if (severity === "low") return null;
  if (severity === "high" && PLANS[plan].instantAlerts) return "instant";
  return "briefing";
}

export type PendingAlert = {
  userEventId: string;
  storeId: string;
  type: EventType;
  dedupeKey: string;
  detectedAt: string; // ISO
};

export type AlertPlan = {
  // One inner array = one bundled alert for one store.
  send: PendingAlert[][];
  // Still pending: bundling window not over yet.
  hold: PendingAlert[];
  // Over the daily cap, or a repeat of recent news: goes to the Monday briefing.
  toBriefing: PendingAlert[];
};

// Bundles that lead with the biggest news go first when the cap bites.
const HEADLINE_TYPES: EventType[] = ["sitewide_sale_detected", "promo_launched"];

/**
 * Plan one user's instant alerts (pure). Bundles pending alerts by store,
 * holds a store's bundle until its burst has settled, drops repeats of news
 * already alerted (they still reach the briefing), and caps alerts per day —
 * biggest news first; overflow falls back to the briefing.
 */
export function planInstantAlerts(
  pending: PendingAlert[],
  opts: {
    now: Date;
    sentToday: number;
    // Dedupe keys this user was alerted about within the dedupe window.
    recentKeys: ReadonlySet<string>;
    cap: number;
    holdMinutes: number;
  },
): AlertPlan {
  const plan: AlertPlan = { send: [], hold: [], toBriefing: [] };

  // Oldest first, so the first occurrence of a key is the one that alerts.
  const ordered = [...pending].sort((a, b) => a.detectedAt.localeCompare(b.detectedAt));
  const seen = new Set(opts.recentKeys);
  const byStore = new Map<string, PendingAlert[]>();
  for (const alert of ordered) {
    if (seen.has(alert.dedupeKey)) {
      plan.toBriefing.push(alert);
      continue;
    }
    seen.add(alert.dedupeKey);
    byStore.set(alert.storeId, [...(byStore.get(alert.storeId) ?? []), alert]);
  }

  const settledBefore = opts.now.getTime() - opts.holdMinutes * 60_000;
  const ready: PendingAlert[][] = [];
  for (const group of byStore.values()) {
    const newest = Date.parse(group[group.length - 1].detectedAt);
    if (newest > settledBefore) plan.hold.push(...group);
    else ready.push(group);
  }

  const leads = (g: PendingAlert[]) => g.some((a) => HEADLINE_TYPES.includes(a.type));
  ready.sort(
    (a, b) =>
      Number(leads(b)) - Number(leads(a)) ||
      b.length - a.length ||
      a[0].detectedAt.localeCompare(b[0].detectedAt),
  );

  const slots = Math.max(0, opts.cap - opts.sentToday);
  plan.send = ready.slice(0, slots);
  for (const group of ready.slice(slots)) plan.toBriefing.push(...group);
  return plan;
}
