import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMailer } from "@/features/digest/mailer";
import { planInstantAlerts, routingConfig, type PendingAlert } from "@/features/events/routing";
import type { EventType, Severity } from "@/features/events/types";
import { resolvePlan } from "@/features/plan/comp";
import { renderAlertEmail, renderAlertSlack, type AlertBundle } from "./render";
import { loadAlertSettings, movesCaughtThisMonth } from "./settings";
import { postToSlack } from "./slack";
import { PLANS } from "@/features/plan/limits";

type PendingRow = {
  id: string;
  user_id: string;
  store_id: string;
  context: { ownMatch?: { title: string; price: number | null } } | null;
  events: {
    id: string;
    type: EventType;
    severity: Severity;
    payload: Record<string, unknown>;
    detected_at: string;
    dedupe_key: string | null;
    snapshot_id: string | null;
    meaning: string | null;
  } | null;
  stores: { name: string; domain: string } | null;
};

export type AlertSendResult = { users: number; sent: number; held: number; toBriefing: number; failed: number };

const one = <T>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/**
 * Send due instant alerts (SPEC.md §5 Phase 4). For each user with pending
 * instant events: drop muted types to the briefing, plan bundles with the
 * pure planner (hold, dedupe, daily cap), send each bundle by email and — on a
 * paid plan with Slack connected — Slack. Anything that can't go instant
 * (muted, capped, repeated, no channel, send failed) falls back to the Monday
 * briefing, so no move is lost.
 */
export async function runAlertSender(service: SupabaseClient, now: Date = new Date()): Promise<AlertSendResult> {
  const totals: AlertSendResult = { users: 0, sent: 0, held: 0, toBriefing: 0, failed: 0 };
  const cfg = routingConfig();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gettrailwatch.com";

  const { data, error } = await service
    .from("user_events")
    .select("id, user_id, store_id, context, events(id, type, severity, payload, detected_at, dedupe_key, snapshot_id, meaning), stores(name, domain)")
    .eq("delivery", "instant")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(2000);
  if (error) throw new Error(`Couldn't load pending alerts: ${error.message}`);

  const rows = (data ?? []).map((r) => ({ ...r, events: one(r.events), stores: one(r.stores) })) as PendingRow[];
  const byUser = new Map<string, PendingRow[]>();
  for (const r of rows) if (r.events) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);
  if (byUser.size === 0) return totals;

  const userIds = [...byUser.keys()];
  const [settingsMap, { data: users }] = await Promise.all([
    loadAlertSettings(service, userIds),
    service.from("users").select("id, email, plan").in("id", userIds),
  ]);
  const usersById = new Map((users ?? []).map((u) => [u.id, u]));
  const mailer = getMailer();

  const toBriefing = async (ids: string[]) => {
    if (ids.length === 0) return;
    await service.from("user_events").update({ delivery: "briefing" }).in("id", ids);
    totals.toBriefing += ids.length;
  };

  for (const [userId, pending] of byUser) {
    totals.users += 1;
    const user = usersById.get(userId);
    const settings = settingsMap.get(userId)!;
    const plan = resolvePlan(user?.email, user?.plan);
    const slackUrl = PLANS[plan].slack ? settings.slackWebhookUrl : null;

    const muted = pending.filter((r) => settings.mutedTypes.includes(r.events!.type));
    const active = pending.filter((r) => !settings.mutedTypes.includes(r.events!.type));
    await toBriefing(muted.map((r) => r.id));
    if (!user?.email || (!settings.emailInstant && !slackUrl)) {
      await toBriefing(active.map((r) => r.id));
      continue;
    }

    // What this user was alerted about in the last day: the daily cap and dedupe.
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await service
      .from("user_events")
      .select("bundle_id, events(dedupe_key)")
      .eq("user_id", userId)
      .eq("delivery", "instant")
      .eq("status", "sent")
      .gte("delivered_at", since);
    const sentToday = new Set((recent ?? []).map((r) => r.bundle_id).filter(Boolean)).size;
    const recentKeys = new Set(
      (recent ?? []).map((r) => one(r.events)?.dedupe_key as string | null | undefined).filter(
        (k): k is string => !!k,
      ),
    );

    const byId = new Map(active.map((r) => [r.id, r]));
    const alerts: PendingAlert[] = active.map((r) => ({
      userEventId: r.id,
      storeId: r.store_id,
      type: r.events!.type,
      dedupeKey: r.events!.dedupe_key ?? `${r.events!.type}:${r.id}`,
      detectedAt: r.events!.detected_at,
    }));
    const alertPlan = planInstantAlerts(alerts, {
      now,
      sentToday,
      recentKeys,
      cap: cfg.alertsPerUserPerDay,
      holdMinutes: cfg.bundleHoldMinutes,
    });
    totals.held += alertPlan.hold.length;
    await toBriefing(alertPlan.toBriefing.map((a) => a.userEventId));
    if (alertPlan.send.length === 0) continue;

    const counter = await movesCaughtThisMonth(service, userId, now);
    const { data: follows } = await service.from("competitors").select("id, store_id").eq("user_id", userId);
    const competitorByStore = new Map((follows ?? []).map((c) => [c.store_id, c.id]));

    for (const group of alertPlan.send) {
      const first = byId.get(group[0].userEventId)!;
      const bundle: AlertBundle = {
        storeName: first.stores?.name ?? "A competitor",
        storeDomain: first.stores?.domain ?? "",
        competitorId: competitorByStore.get(first.store_id) ?? null,
        events: group.map((a) => {
          const row = byId.get(a.userEventId)!;
          const e = row.events!;
          return {
            eventId: e.id,
            type: e.type,
            severity: e.severity,
            payload: e.payload,
            detectedAt: e.detected_at,
            snapshotId: e.snapshot_id,
            meaning: e.meaning,
            ownMatch: row.context?.ownMatch ?? null,
          };
        }),
      };

      const results = await Promise.all([
        settings.emailInstant ? mailer.send(settings.sendTo ?? user.email, renderAlertEmail(bundle, siteUrl, counter, settings.sendTo ?? user.email)) : null,
        slackUrl ? postToSlack(slackUrl, renderAlertSlack(bundle, siteUrl)) : null,
      ]);
      const ids = group.map((a) => a.userEventId);
      if (results.some((r) => r?.sent)) {
        await service
          .from("user_events")
          .update({ status: "sent", bundle_id: randomUUID(), delivered_at: now.toISOString() })
          .in("id", ids);
        totals.sent += 1;
      } else {
        // Every channel failed: don't retry forever — the briefing carries it.
        const reasons = results.filter((r) => r && !r.sent).map((r) => (r as { reason: string }).reason);
        console.warn(`Instant alert failed for user ${userId}: ${reasons.join("; ")}`);
        totals.failed += 1;
        await toBriefing(ids);
      }
    }
  }
  return totals;
}
