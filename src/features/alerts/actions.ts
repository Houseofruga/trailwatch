"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { resolvePlan } from "@/features/plan/comp";
import type { Plan } from "@/features/plan/limits";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DEFAULT_ALERT_SETTINGS, loadAlertSettings, movesCaughtThisMonth, MUTABLE_TYPES } from "./settings";
import { isSlackWebhookUrl } from "./slack";

export type AlertSettingsView = {
  plan: Plan;
  emailInstant: boolean;
  // Never the URL itself — once saved it stays server-side.
  slackConnected: boolean;
  mutedTypes: string[];
  movesThisMonth: number;
};

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("plan").eq("id", user.id).single();
  return { user, plan: resolvePlan(user.email, profile?.plan === "paid" ? "paid" : "free") };
}

/** The caller's alert settings, for the (pending-design) Alert settings screen. */
export async function getAlertSettings(): Promise<AlertSettingsView> {
  const { user, plan } = await currentUser();
  const service = createServiceClient();
  const settings = (await loadAlertSettings(service, [user.id])).get(user.id) ?? DEFAULT_ALERT_SETTINGS;
  return {
    plan,
    emailInstant: settings.emailInstant,
    slackConnected: !!settings.slackWebhookUrl,
    mutedTypes: settings.mutedTypes,
    movesThisMonth: await movesCaughtThisMonth(service, user.id),
  };
}

const input = z.object({
  emailInstant: z.boolean(),
  mutedTypes: z.array(z.enum(MUTABLE_TYPES)).max(MUTABLE_TYPES.length),
  // undefined = keep the saved webhook; null = disconnect; string = connect.
  slackWebhookUrl: z
    .string()
    .trim()
    .refine(isSlackWebhookUrl, "Paste a Slack incoming-webhook URL (https://hooks.slack.com/services/…).")
    .nullable()
    .optional(),
});

export type SaveAlertSettingsResult = { ok: true } | { ok: false; error: string };

export async function saveAlertSettings(raw: unknown): Promise<SaveAlertSettingsResult> {
  const { user, plan } = await currentUser();
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { emailInstant, mutedTypes, slackWebhookUrl } = parsed.data;

  // Slack is a paid-plan channel — enforced here, not trusted from the client.
  if (slackWebhookUrl && plan === "free") {
    return { ok: false, error: "Slack alerts are on paid plans. Upgrade to connect Slack." };
  }

  const row: Record<string, unknown> = {
    user_id: user.id,
    email_instant: emailInstant,
    muted_types: mutedTypes,
    updated_at: new Date().toISOString(),
  };
  if (slackWebhookUrl !== undefined) row.slack_webhook_url = slackWebhookUrl;

  // Service role: the table has no client policies, so the webhook URL can't be
  // read back through the API.
  const { error } = await createServiceClient().from("alert_settings").upsert(row, { onConflict: "user_id" });
  if (error) return { ok: false, error: "Couldn't save your alert settings. Try again." };

  revalidatePath("/settings");
  return { ok: true };
}
