import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventType } from "@/features/events/types";

export type AlertSettings = {
  emailInstant: boolean;
  // Server-side only — never sent to the client once saved.
  slackWebhookUrl: string | null;
  // Event types this user doesn't want instant alerts for (they still reach the briefing).
  mutedTypes: EventType[];
  // Where our emails go (alerts and the Monday briefing); null = the account email.
  sendTo: string | null;
};

export const DEFAULT_ALERT_SETTINGS: AlertSettings = { emailInstant: true, slackWebhookUrl: null, mutedTypes: [], sendTo: null };

// Instant-alert types a user can mute (the high-severity ones — the rest never
// alert instantly anyway).
export const MUTABLE_TYPES = [
  "sitewide_sale_detected",
  "promo_launched",
  "price_position_change",
  "sale_started",
  "product_launched",
  "sold_out",
] as const;

/** Settings for many users at once (service role). Users without a row get the defaults. */
export async function loadAlertSettings(service: SupabaseClient, userIds: string[]): Promise<Map<string, AlertSettings>> {
  const map = new Map<string, AlertSettings>();
  if (userIds.length === 0) return map;
  const { data, error } = await service
    .from("alert_settings")
    .select("user_id, email_instant, slack_webhook_url, muted_types, send_to")
    .in("user_id", userIds);
  if (error) throw new Error(`Couldn't load alert settings: ${error.message}`);
  for (const row of data ?? []) {
    map.set(row.user_id, {
      emailInstant: row.email_instant,
      slackWebhookUrl: row.slack_webhook_url,
      mutedTypes: row.muted_types ?? [],
      sendTo: row.send_to ?? null,
    });
  }
  for (const id of userIds) if (!map.has(id)) map.set(id, DEFAULT_ALERT_SETTINGS);
  return map;
}

/**
 * "Competitor moves caught this month: N" — every event fanned out to this user
 * since the start of the month (UTC), instant or briefing. Shown on the
 * dashboard and in email footers.
 */
export async function movesCaughtThisMonth(service: SupabaseClient, userId: string, now: Date = new Date()): Promise<number> {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { count } = await service
    .from("user_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart);
  return count ?? 0;
}
