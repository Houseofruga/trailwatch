"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { LIMITS, type Plan } from "@/features/plan/limits";
import { competitorName, pageRow } from "./validation";
import { normalizeDomainInput, originOf, replaceUrlHost } from "./domain";

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
    .select("id, name, pages(id)")
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

export async function updateCompetitor(
  competitorId: string,
  name: string,
  domainInput: string,
): Promise<{ error?: string }> {
  const nameResult = competitorName.safeParse(name);
  if (!nameResult.success) return { error: nameResult.error.issues[0].message };

  const newOrigin = normalizeDomainInput(domainInput);
  if (!newOrigin) return { error: "Enter a valid domain, like example.com." };

  const supabase = await createClient();

  const { error: nameError } = await supabase
    .from("competitors")
    .update({ name: nameResult.data })
    .eq("id", competitorId);
  if (nameError) return { error: "Couldn't save that name. Try again." };

  const { data: pages, error: pagesError } = await supabase
    .from("pages")
    .select("id, url")
    .eq("competitor_id", competitorId);
  if (pagesError) return { error: "Couldn't load that competitor's pages. Try again." };

  // Only move pages that were already on the domain being edited. A page
  // that's on some other domain wasn't part of "this" domain to begin with
  // — cascading to it would silently corrupt an intentionally different URL.
  const priorOrigin = originOf(pages?.[0]?.url ?? "");
  for (const page of pages ?? []) {
    if (originOf(page.url) !== priorOrigin) continue;
    const nextUrl = replaceUrlHost(page.url, newOrigin);
    if (nextUrl === page.url) continue;
    const { error: urlError } = await supabase.from("pages").update({ url: nextUrl }).eq("id", page.id);
    if (urlError) return { error: "Updated the name, but couldn't update every page's URL. Try again." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/competitors");
  return {};
}

export async function deleteCompetitor(competitorId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("competitors").delete().eq("id", competitorId);
  if (error) throw new Error("Couldn't delete that competitor.");
  revalidatePath("/dashboard");
  revalidatePath("/competitors");
}
