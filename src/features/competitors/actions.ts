"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { LIMITS, type Plan } from "@/features/plan/limits";
import { resolvePlan } from "@/features/plan/comp";
import { runCheckForPage } from "@/features/checks/runCheck";
import { competitorName, pageRow } from "./validation";
import { normalizeUrl } from "./url";
import { originOf, sameSite, siteOf } from "./domain";

export type FormState = { error: string } | null;

function flashUrl(path: string, message: string) {
  return `${path}?flash=${encodeURIComponent(message)}`;
}

/**
 * Loads the caller's plan and current usage straight from the DB. Every
 * mutation below re-checks limits against this, not against anything the
 * client sent — plan/limit values are never trusted from the form.
 */
async function loadPlanAndUsage(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: competitors }] = await Promise.all([
    supabase.from("users").select("plan").eq("id", user.id).single(),
    supabase.from("competitors").select("id"),
  ]);

  const plan: Plan = resolvePlan(user.email, profile?.plan === "paid" ? "paid" : "free");
  return { userId: user.id, plan, competitorCount: competitors?.length ?? 0 };
}

// Pages under one competitor must share a registrable domain — subdomains of
// the same site (www., docs., app.) count as the same competitor; different
// domains belong to different competitors. `establishedUrl` is the URL that sets
// the domain (the competitor's first existing page, or the first row on
// a brand-new competitor).
function findDomainMismatch(establishedUrl: string, rows: { url: string }[]): string | null {
  const domain = siteOf(establishedUrl) ?? originOf(establishedUrl);
  const mismatch = rows.find((r) => !sameSite(establishedUrl, r.url));
  if (!mismatch) return null;
  return `All pages for one competitor must be on ${domain} — add a separate competitor for other domains.`;
}

// Instant baseline: right after a page is created, capture its first snapshot
// so the user sees value immediately instead of waiting for the daily cron.
// Reuses the F3 check — on a page with no prior snapshot, runCheckForPage stores
// the baseline and creates NO change row and NO LLM summary. A failed fetch is a
// soft-fail: the page still exists and the daily cron (or Check now) captures it
// later, so one unreachable URL never breaks the add.
type CaptureOutcome = { label: string; captured: boolean };

async function captureBaselines(pages: { id: string; label: string }[]): Promise<CaptureOutcome[]> {
  const settled = await Promise.allSettled(pages.map((p) => runCheckForPage(p.id)));
  return pages.map((p, i) => {
    const r = settled[i];
    const captured =
      r.status === "fulfilled" &&
      (r.value.status === "first-check" ||
        r.value.status === "unchanged" ||
        r.value.status === "recorded");
    return { label: p.label, captured };
  });
}

// Insert one competitor + its pages and capture baselines. The shared core of
// createCompetitor, reused by seedCompetitors (onboarding pre-seed). Caller does
// all limit/validation checks and any redirect.
async function insertCompetitorWithPages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  name: string,
  rows: { url: string; label: string }[],
): Promise<{ ok: true; outcomes: CaptureOutcome[] } | { ok: false; error: string }> {
  const { data: competitor, error: competitorError } = await supabase
    .from("competitors")
    .insert({ name, user_id: userId })
    .select("id")
    .single();
  if (competitorError || !competitor) {
    return { ok: false, error: "Couldn't create the competitor. Try again." };
  }

  const { data: newPages, error: pagesError } = await supabase
    .from("pages")
    .insert(rows.map((r) => ({ competitor_id: competitor.id, url: r.url, label: r.label })))
    .select("id, label");
  if (pagesError || !newPages) {
    return { ok: false, error: "Competitor was created, but adding pages failed. Try again from Competitors." };
  }

  const outcomes = await captureBaselines(newPages);
  return { ok: true, outcomes };
}

function today(): string {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Confirmation copy from SPEC-instant-snapshot.md §4.
function captureFlash(outcomes: CaptureOutcome[]): string {
  const captured = outcomes.filter((o) => o.captured);
  const failed = outcomes.filter((o) => !o.captured);
  const date = today();

  if (failed.length === 0) {
    return captured.length === 1
      ? `✓ Captured ${captured[0].label} as of ${date}. We'll alert you the moment it changes.`
      : `✓ Captured ${captured.length} pages as of ${date}. We'll alert you the moment they change.`;
  }
  if (captured.length === 0) {
    return failed.length === 1
      ? `Added ${failed[0].label}, but we couldn't reach it yet. We'll keep trying — next check is tonight.`
      : `Added ${failed.length} pages, but we couldn't reach them yet. We'll keep trying — next check is tonight.`;
  }
  return `Captured ${captured.length} of ${outcomes.length} pages as of ${date}. We couldn't reach ${failed.length} yet — we'll retry tonight.`;
}

function readPageRows(formData: FormData) {
  const urls = formData.getAll("url");
  const labels = formData.getAll("label");
  const rows: { url: string; label: string }[] = [];
  for (let i = 0; i < urls.length; i++) {
    const url = String(urls[i] ?? "").trim();
    if (!url) continue; // blank rows are just unused slots in the form
    rows.push({ url, label: String(labels[i] ?? "").trim() || "Page" });
  }
  return rows;
}

export async function createCompetitor(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { userId, plan, competitorCount } = await loadPlanAndUsage(supabase);
  const limits = LIMITS[plan];

  if (competitorCount >= limits.competitors) {
    return { error: `You're already tracking all ${limits.competitors} competitors on ${plan === "free" ? "Free" : "Pro"}.` };
  }

  const nameResult = competitorName.safeParse(formData.get("name"));
  if (!nameResult.success) return { error: nameResult.error.issues[0].message };

  const rawRows = readPageRows(formData);
  if (rawRows.length === 0) return { error: "Add at least one page URL." };
  if (rawRows.length > limits.pagesPerCompetitor) {
    return { error: `${plan === "free" ? "Free" : "Pro"} allows up to ${limits.pagesPerCompetitor} pages per competitor.` };
  }

  const rowsResult = z.array(pageRow).safeParse(rawRows);
  if (!rowsResult.success) return { error: rowsResult.error.issues[0].message };

  const domainError = findDomainMismatch(rowsResult.data[0].url, rowsResult.data);
  if (domainError) return { error: domainError };

  const result = await insertCompetitorWithPages(supabase, userId, nameResult.data, rowsResult.data);
  if (!result.ok) return { error: result.error };

  revalidatePath("/dashboard");
  revalidatePath("/competitors");
  redirect(flashUrl("/dashboard", captureFlash(result.outcomes)));
}

// --------------------------------------------------------------- pre-seed (onboarding)
export type SeedCompetitorInput = { name: string; url: string };

/**
 * Onboarding pre-seed: create the competitors the visitor picked on /try, each
 * with its homepage as the first watched page. Re-checks the plan limit
 * server-side and caps to the remaining slots — never trusts the client's count.
 * Invalid rows (bad/blank URL, empty name) are skipped rather than failing the
 * whole batch. Returns how many were created; the client redirects.
 */
export async function seedCompetitors(
  items: SeedCompetitorInput[],
): Promise<{ error: string } | { created: number; requested: number }> {
  const supabase = await createClient();
  const { userId, plan, competitorCount } = await loadPlanAndUsage(supabase);
  const limits = LIMITS[plan];
  const remaining = Math.max(0, limits.competitors - competitorCount);
  if (remaining === 0) {
    return {
      error: `You're already tracking all ${limits.competitors} competitors on ${plan === "free" ? "Free" : "Pro"}.`,
    };
  }

  const toCreate = items.slice(0, remaining);
  let created = 0;
  for (const item of toCreate) {
    const nameResult = competitorName.safeParse(item.name);
    if (!nameResult.success) continue;
    const rowResult = pageRow.safeParse({ url: normalizeUrl(item.url), label: "Homepage" });
    if (!rowResult.success) continue;
    const res = await insertCompetitorWithPages(supabase, userId, nameResult.data, [rowResult.data]);
    if (res.ok) created++;
  }

  revalidatePath("/dashboard");
  revalidatePath("/competitors");
  return { created, requested: items.length };
}

export async function addPages(_prev: FormState, formData: FormData): Promise<FormState> {
  const competitorId = String(formData.get("competitorId") ?? "");
  if (!competitorId) return { error: "Missing competitor." };

  const supabase = await createClient();
  const { plan } = await loadPlanAndUsage(supabase);
  const limits = LIMITS[plan];

  const { data: competitor } = await supabase
    .from("competitors")
    .select("id, name, pages(id, url)")
    .eq("id", competitorId)
    .single();
  if (!competitor) return { error: "That competitor no longer exists." };

  const existingCount = competitor.pages?.length ?? 0;
  const rawRows = readPageRows(formData);
  if (rawRows.length === 0) return { error: "Add at least one page URL." };
  if (existingCount + rawRows.length > limits.pagesPerCompetitor) {
    return {
      error: `${competitor.name} can have at most ${limits.pagesPerCompetitor} pages on ${plan === "free" ? "Free" : "Pro"}.`,
    };
  }

  const rowsResult = z.array(pageRow).safeParse(rawRows);
  if (!rowsResult.success) return { error: rowsResult.error.issues[0].message };

  const establishedUrl = competitor.pages?.[0]?.url ?? rowsResult.data[0].url;
  const domainError = findDomainMismatch(establishedUrl, rowsResult.data);
  if (domainError) return { error: domainError };

  const { data: newPages, error } = await supabase
    .from("pages")
    .insert(rowsResult.data.map((r) => ({ competitor_id: competitorId, url: r.url, label: r.label })))
    .select("id, label");
  if (error || !newPages) return { error: "Couldn't add those pages. Try again." };

  const outcomes = await captureBaselines(newPages);

  revalidatePath("/dashboard");
  revalidatePath("/competitors");
  redirect(flashUrl("/competitors", captureFlash(outcomes)));
}

export async function togglePageActive(pageId: string, nextActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("pages").update({ is_active: nextActive }).eq("id", pageId);
  if (error) throw new Error("Couldn't update that page.");
  revalidatePath("/dashboard");
  revalidatePath("/competitors");
}

export async function deletePage(pageId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("pages").delete().eq("id", pageId);
  if (error) throw new Error("Couldn't delete that page.");
  revalidatePath("/dashboard");
  revalidatePath("/competitors");
}

export async function updatePage(
  pageId: string,
  url: string,
  label: string,
): Promise<{ error?: string }> {
  const rowResult = pageRow.safeParse({ url, label });
  if (!rowResult.success) return { error: rowResult.error.issues[0].message };

  const supabase = await createClient();

  const { data: page } = await supabase
    .from("pages")
    .select("id, competitor_id")
    .eq("id", pageId)
    .single();
  if (!page) return { error: "That page no longer exists." };

  // The competitor's domain is set by its *other* pages. If this is the only
  // page, it defines the domain itself, so any domain is fair game.
  const { data: siblings } = await supabase
    .from("pages")
    .select("url")
    .eq("competitor_id", page.competitor_id)
    .neq("id", pageId);

  const sibling = siblings?.[0];
  if (sibling && !sameSite(sibling.url, rowResult.data.url)) {
    return {
      error: `Must be on ${siteOf(sibling.url) ?? originOf(sibling.url)} — use Edit to move every page to a new domain.`,
    };
  }

  const { error } = await supabase
    .from("pages")
    .update({ url: rowResult.data.url, label: rowResult.data.label })
    .eq("id", pageId);
  if (error) return { error: "Couldn't save that page. Try again." };

  revalidatePath("/dashboard");
  revalidatePath("/competitors");
  return {};
}

export type EditFormState = { error: string } | null;

export async function updateCompetitorDetails(
  _prev: EditFormState,
  formData: FormData,
): Promise<EditFormState> {
  const competitorId = String(formData.get("competitorId") ?? "");
  if (!competitorId) return { error: "Missing competitor." };

  const nameResult = competitorName.safeParse(formData.get("name"));
  if (!nameResult.success) return { error: nameResult.error.issues[0].message };

  // The form posts each page's full URL and label; the domain field is a
  // client-side convenience for rewriting them all, so it isn't submitted.
  // A blank pageId means a row added on this screen — insert, don't update.
  const ids = formData.getAll("pageId").map(String);
  const urls = formData.getAll("url").map((v) => String(v).trim());
  const labels = formData.getAll("label").map((v) => String(v).trim());

  const rows = ids
    .map((id, i) => ({ id, url: urls[i] ?? "", label: labels[i] ?? "" }))
    .filter((row) => row.id || row.url || row.label); // drop untouched new slots
  if (rows.length === 0) return { error: "A competitor needs at least one page." };

  const supabase = await createClient();
  const { plan } = await loadPlanAndUsage(supabase);
  const limits = LIMITS[plan];
  if (rows.length > limits.pagesPerCompetitor) {
    return {
      error: `${plan === "free" ? "Free" : "Pro"} allows up to ${limits.pagesPerCompetitor} pages per competitor.`,
    };
  }

  const rowsResult = z.array(pageRow).safeParse(rows.map(({ url, label }) => ({ url, label })));
  if (!rowsResult.success) return { error: rowsResult.error.issues[0].message };

  const domainError = findDomainMismatch(rowsResult.data[0].url, rowsResult.data);
  if (domainError) return { error: domainError };

  const { error: nameError } = await supabase
    .from("competitors")
    .update({ name: nameResult.data })
    .eq("id", competitorId);
  if (nameError) return { error: "Couldn't save that name. Try again." };

  for (const [i, row] of rows.entries()) {
    const { url, label } = rowsResult.data[i];
    const { error: pageError } = row.id
      ? await supabase.from("pages").update({ url, label }).eq("id", row.id)
      : await supabase.from("pages").insert({ competitor_id: competitorId, url, label });
    if (pageError) return { error: "Updated the name, but couldn't save every page. Try again." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/competitors");
  redirect(flashUrl("/competitors", `${nameResult.data} updated`));
}

export async function deleteCompetitor(competitorId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("competitors").delete().eq("id", competitorId);
  if (error) throw new Error("Couldn't delete that competitor.");
  revalidatePath("/dashboard");
  revalidatePath("/competitors");
}
