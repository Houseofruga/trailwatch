"use server";

// Server actions behind the app screens (UI Step 6). Every write re-reads the
// user and plan on the server; nothing about limits or plans is trusted from
// the client. Slack webhook URLs are written here and never read back out.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MUTABLE_TYPES } from "@/features/alerts/settings";
import { isSlackWebhookUrl, postToSlack } from "@/features/alerts/slack";
import { addCompetitorByDomain, deleteCompetitor } from "@/features/competitors/actions";
import { resolvePlan } from "@/features/plan/comp";
import { PLANS } from "@/features/plan/limits";
import { clearOwnStore, setOwnStore } from "@/features/stores/ownStore";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOnboardingStatus, getOwnStore } from "./queries";
import { ROLES, type UserRole } from "./roles";
import type { OnboardingItem } from "./types";

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("email, plan").eq("id", user.id).single();
  const email = profile?.email ?? user.email ?? "";
  return { supabase, user, email, plan: resolvePlan(email, profile?.plan) };
}

const revalidateApp = () => revalidatePath("/", "layout");

// ------------------------------------------------------------ competitors

export type AddResult = { ok: true; competitorId: string } | { ok: false; error: string };

export async function addCompetitor(domain: string): Promise<AddResult> {
  const result = await addCompetitorByDomain(domain);
  if (!result.ok) return { ok: false, error: result.message };
  revalidateApp();
  return { ok: true, competitorId: result.competitorId };
}

export async function removeCompetitor(competitorId: string): Promise<{ ok: boolean }> {
  try {
    await deleteCompetitor(competitorId);
  } catch {
    return { ok: false };
  }
  revalidateApp();
  return { ok: true };
}

/** Onboarding's live list: each added store's read status (polled while reading). */
export async function onboardingStatus(): Promise<OnboardingItem[]> {
  return getOnboardingStatus();
}

// ------------------------------------------------------------ your store

export type StoreResult = { ok: true } | { ok: false; error: string };

/** Set (or with "" clear) the user's own store. */
export async function saveOwnStore(domain: string): Promise<StoreResult> {
  if (!domain.trim()) {
    await clearOwnStore();
    revalidateApp();
    return { ok: true };
  }
  const result = await setOwnStore(domain);
  if (!result.ok) return { ok: false, error: result.message };
  revalidateApp();
  return { ok: true };
}

/** Onboarding's optional "What's your role?". users is service-role-write only (migration 0004). */
export async function saveRole(role: string): Promise<{ ok: boolean }> {
  const parsed = z.enum(ROLES.map((r) => r.value) as [UserRole, ...UserRole[]]).safeParse(role);
  if (!parsed.success) return { ok: false };
  const { user } = await currentUser();
  const { error } = await createServiceClient().from("users").update({ role: parsed.data }).eq("id", user.id);
  return { ok: !error };
}

// ------------------------------------------------------------ settings

const TIME_ZONE_OK = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const settingsInput = z.object({
  emailAlerts: z.boolean(),
  sendTo: z.string().trim().email("Enter an email like jo@glowfield.com."),
  alertTypes: z.record(z.enum(MUTABLE_TYPES), z.boolean()),
  briefing: z.object({
    enabled: z.boolean(),
    hour: z.number().int().min(6).max(11),
    timeZone: z.string().refine(TIME_ZONE_OK, "Pick a time zone."),
  }),
  storeDomain: z.string().trim().max(253),
  name: z.string().trim().min(1, "Enter a name.").max(80, "That name is too long."),
});

export type SaveSettingsResult = { ok: true } | { ok: false; error: string };

export async function saveSettings(raw: unknown): Promise<SaveSettingsResult> {
  const { supabase, user, email } = await currentUser();
  const parsed = settingsInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const f = parsed.data;

  // Your store first: it's the one part that can be rejected (can't reach it).
  const current = await getOwnStore();
  if (f.storeDomain !== (current?.domain ?? "")) {
    const store = await saveOwnStore(f.storeDomain);
    if (!store.ok) return store;
  }

  const service = createServiceClient();
  const [alerts, profile, name] = await Promise.all([
    // Service role: alert_settings has no client policies (the Slack URL stays server-side).
    service.from("alert_settings").upsert(
      {
        user_id: user.id,
        email_instant: f.emailAlerts,
        send_to: f.sendTo.toLowerCase() === email.toLowerCase() ? null : f.sendTo,
        muted_types: MUTABLE_TYPES.filter((t) => f.alertTypes[t] === false),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    ),
    // users is service-role-write only (migration 0004).
    service
      .from("users")
      .update({ digest_enabled: f.briefing.enabled, briefing_hour: f.briefing.hour, briefing_time_zone: f.briefing.timeZone })
      .eq("id", user.id),
    f.name !== (user.user_metadata?.full_name ?? "") ? supabase.auth.updateUser({ data: { full_name: f.name } }) : null,
  ]);
  if (alerts.error || profile.error || name?.error) return { ok: false, error: "Couldn't save. Try again." };

  revalidateApp();
  return { ok: true };
}

// ------------------------------------------------------------ Slack

export type SlackActionResult = { ok: true } | { ok: false; error: string };

const SLACK_URL_ERROR = "Enter a Slack webhook URL. It starts with https://hooks.slack.com/";

export async function connectSlack(url: string): Promise<SlackActionResult> {
  const { user, plan } = await currentUser();
  if (!isSlackWebhookUrl(url)) return { ok: false, error: SLACK_URL_ERROR };
  if (!PLANS[plan].slack) return { ok: false, error: "Slack alerts are on the Pro plan." };
  const { error } = await createServiceClient()
    .from("alert_settings")
    .upsert({ user_id: user.id, slack_webhook_url: url.trim(), updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { ok: false, error: "Couldn't connect Slack. Try again." };
  revalidatePath("/settings");
  return { ok: true };
}

export async function disconnectSlack(): Promise<SlackActionResult> {
  const { user } = await currentUser();
  const { error } = await createServiceClient()
    .from("alert_settings")
    .update({ slack_webhook_url: null, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Couldn't disconnect Slack. Try again." };
  revalidatePath("/settings");
  return { ok: true };
}

export async function sendSlackTest(): Promise<SlackActionResult> {
  const { user } = await currentUser();
  const { data } = await createServiceClient()
    .from("alert_settings")
    .select("slack_webhook_url")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data?.slack_webhook_url) return { ok: false, error: "Slack isn't connected." };
  const res = await postToSlack(data.slack_webhook_url, {
    text: "TrailWatch is connected. Big competitor moves will show up in this channel.",
  });
  return res.sent ? { ok: true } : { ok: false, error: "Slack test failed" };
}
