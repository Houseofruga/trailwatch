"use server";

// Server actions behind the app screens (UI Step 6). Every write re-reads the
// user and plan on the server; nothing about limits or plans is trusted from
// the client. Slack webhook URLs are written here and never read back out.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { MUTABLE_TYPES } from "@/features/alerts/settings";
import { isSlackWebhookUrl, postToSlack } from "@/features/alerts/slack";
import { runFind } from "@/features/competitorFinder/find";
import {
  cacheIsFresh,
  pickSuggestions,
  SUGGEST_CONFIG,
  toSuggestions,
  type Suggestion,
} from "@/features/competitorFinder/suggest";
import { addCompetitorByDomain, deleteCompetitor } from "@/features/competitors/actions";
import { resolvePlan } from "@/features/plan/comp";
import { PLANS } from "@/features/plan/limits";
import { canonicalStoreHost } from "@/features/stores/domain";
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

// ------------------------------------------------------------ suggestions

export type SuggestResult =
  | { ok: true; suggestions: Suggestion[] }
  | { ok: false; reason: "no-store" | "none" | "busy" | "error"; message: string };

/**
 * Shopify stores that compete with the user's own store (onboarding step 2 and
 * the Add competitor modal). A cached result is reused for a week; `refresh`
 * ("Find more") searches again, at most once a minute. Stores the user already
 * follows are skipped.
 */
export async function suggestCompetitors(opts: { refresh?: boolean; basis?: string } = {}): Promise<SuggestResult> {
  const { supabase, user } = await currentUser();
  const ownStore = await getOwnStore();
  // Widget onboarding: no store of their own yet, so suggest from the
  // competitor they looked up (a competitor's competitors share their market).
  const basis = !ownStore && opts.basis ? canonicalStoreHost(opts.basis) : null;
  const own = ownStore ?? (basis ? { domain: basis } : null);
  if (!own) return { ok: false, reason: "no-store", message: "Add your store in Settings to get suggestions." };

  const { data: rows } = await supabase.from("competitors").select("stores(domain)").not("store_id", "is", null);
  const followed = (rows ?? []).flatMap((r) => {
    const s = r.stores as { domain: string } | { domain: string }[] | null;
    return (Array.isArray(s) ? s : s ? [s] : []).map((x) => x.domain);
  });
  const exclude = [own.domain, ...followed];

  const service = createServiceClient();
  const { data: cached } = await service
    .from("users")
    .select("suggestions, suggestions_store, suggestions_at")
    .eq("id", user.id)
    .single();
  const saved = { store: cached?.suggestions_store ?? null, at: cached?.suggestions_at ?? null };
  const savedList = (cached?.suggestions as Suggestion[] | null) ?? [];

  if (!opts.refresh && cacheIsFresh(saved, own.domain)) {
    const shown = pickSuggestions(savedList, exclude);
    if (shown.length > 0) return { ok: true, suggestions: shown };
  }
  if (saved.at && Date.now() - new Date(saved.at).getTime() < SUGGEST_CONFIG.refreshCooldownMs) {
    const shown = pickSuggestions(savedList, exclude);
    return shown.length > 0 && !opts.refresh
      ? { ok: true, suggestions: shown }
      : { ok: false, reason: "busy", message: "Give it a minute, then try again." };
  }

  let found;
  try {
    found = await runFind(own.domain, 8);
  } catch {
    return { ok: false, reason: "error", message: "We couldn't search just now. Try again, or add stores you know above." };
  }
  // Merge with what we had, so "Find more" never loses earlier suggestions.
  const fresh = found.ok ? toSuggestions(found.result.competitors) : [];
  const merged = toSuggestions([
    ...fresh.map((s) => ({ name: s.name, url: s.domain, why: s.why })),
    ...(saved.store === own.domain ? savedList : []).map((s) => ({ name: s.name, url: s.domain, why: s.why })),
  ]);
  await service
    .from("users")
    .update({ suggestions: merged, suggestions_store: own.domain, suggestions_at: new Date().toISOString() })
    .eq("id", user.id);

  const shown = pickSuggestions(merged, exclude);
  if (shown.length > 0) return { ok: true, suggestions: shown };
  return {
    ok: false,
    reason: "none",
    message: "We couldn't find Shopify stores that compete with yours. Add the ones you know above.",
  };
}

// ------------------------------------------------------------ product matches

const matchInput = z.object({
  competitorId: z.string().uuid(),
  compProductId: z.string().trim().min(1).max(100),
  ownProductId: z.string().trim().min(1).max(100),
});

/**
 * Confirm, reject or manually link a pair of products (yours, theirs).
 * Rejected pairs never come back; confirmed and linked pairs are always active.
 * Written with the user's own client (RLS: their own rows only).
 */
async function setMatchVerdict(raw: unknown, verdict: "confirmed" | "rejected", manual: boolean): Promise<{ ok: boolean }> {
  const parsed = matchInput.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const { supabase, user } = await currentUser();
  const [{ data: profile }, { data: competitor }] = await Promise.all([
    supabase.from("users").select("own_store_id").eq("id", user.id).single(),
    supabase.from("competitors").select("store_id").eq("id", parsed.data.competitorId).maybeSingle(),
  ]);
  if (!profile?.own_store_id || !competitor?.store_id) return { ok: false };
  const { error } = await supabase.from("match_feedback").upsert({
    user_id: user.id,
    own_store_id: profile.own_store_id,
    own_product_id: parsed.data.ownProductId,
    comp_store_id: competitor.store_id,
    comp_product_id: parsed.data.compProductId,
    verdict,
    manual,
  });
  if (error) return { ok: false };
  revalidateApp();
  return { ok: true };
}

export async function confirmMatch(input: unknown) {
  return setMatchVerdict(input, "confirmed", false);
}

export async function rejectMatch(input: unknown) {
  return setMatchVerdict(input, "rejected", false);
}

export async function linkProducts(input: unknown) {
  return setMatchVerdict(input, "confirmed", true);
}

// ------------------------------------------------------------ widget onboarding

/** onboarding_completed_from_widget: stamp the preview this user claimed. Best-effort. */
export async function finishWidgetOnboarding(): Promise<void> {
  const { user } = await currentUser();
  await createServiceClient()
    .from("previews")
    .update({ completed_at: new Date().toISOString() })
    .eq("claimed_by", user.id)
    .is("completed_at", null);
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
