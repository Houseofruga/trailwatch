"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { LIMITS, type Plan } from "@/features/plan/limits";
import { competitorName, pageRow } from "./validation";
import { originOf, sameOrigin } from "./domain";

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

  const plan: Plan = profile?.plan === "paid" ? "paid" : "free";
  return { userId: user.id, plan, competitorCount: competitors?.length ?? 0 };
}

// Pages under one competitor must share a domain — different domains
// belong to different competitors. `establishedUrl` is the URL that sets
// the domain (the competitor's first existing page, or the first row on
// a brand-new competitor).
function findDomainMismatch(establishedUrl: string, rows: { url: string }[]): string | null {
  const domain = originOf(establishedUrl);
  const mismatch = rows.find((r) => !sameOrigin(establishedUrl, r.url));
  if (!mismatch) return null;
  return `All pages for one competitor must be on ${domain} — add a separate competitor for other domains.`;
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

  const { data: competitor, error: competitorError } = await supabase
    .from("competitors")
    .insert({ name: nameResult.data, user_id: userId })
    .select("id")
    .single();
  if (competitorError || !competitor) return { error: "Couldn't create the competitor. Try again." };

  const { error: pagesError } = await supabase
    .from("pages")
    .insert(rowsResult.data.map((r) => ({ competitor_id: competitor.id, url: r.url, label: r.label })));
  if (pagesError) return { error: "Competitor was created, but adding pages failed. Try again from Competitors." };

  revalidatePath("/dashboard");
  revalidatePath("/competitors");
  redirect(
    flashUrl(
      "/dashboard",
      `${nameResult.data} added — ${rowsResult.data.length} page${rowsResult.data.length === 1 ? "" : "s"} tracked`,
    ),
  );
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

  const { error } = await supabase
    .from("pages")
    .insert(rowsResult.data.map((r) => ({ competitor_id: competitorId, url: r.url, label: r.label })));
  if (error) return { error: "Couldn't add those pages. Try again." };

  revalidatePath("/dashboard");
  revalidatePath("/competitors");
  redirect(
    flashUrl(
      "/competitors",
      `${rowsResult.data.length} page${rowsResult.data.length === 1 ? "" : "s"} added to ${competitor.name}`,
    ),
  );
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
  if (sibling && !sameOrigin(sibling.url, rowResult.data.url)) {
    return {
      error: `Must be on ${originOf(sibling.url)} — use Edit to move every page to a new domain.`,
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
