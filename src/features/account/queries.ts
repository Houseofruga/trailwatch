import { createClient } from "@/lib/supabase/server";
import { LIMITS, type Plan } from "@/features/plan/limits";

export type Account = {
  email: string;
  displayName: string;
  initials: string;
  plan: Plan;
  competitorCount: number;
  pageCount: number;
  /** Total pages allowed across the competitors that exist today. */
  pageAllowance: number;
};

/** Google gives us a full name; email/password signups only give us an address. */
function deriveDisplayName(email: string, metadataName: unknown): string {
  if (typeof metadataName === "string" && metadataName.trim()) return metadataName.trim();
  return email.split("@")[0];
}

function deriveInitials(displayName: string): string {
  const parts = displayName.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return displayName.slice(0, 2).toUpperCase();
}

export async function getAccount(): Promise<Account | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileResult, competitorsResult, pagesResult] = await Promise.all([
    supabase.from("users").select("email, plan").eq("id", user.id).single(),
    supabase.from("competitors").select("id"),
    supabase.from("pages").select("id"),
  ]);

  const email = profileResult.data?.email ?? user.email ?? "";
  const plan: Plan = profileResult.data?.plan === "paid" ? "paid" : "free";
  const displayName = deriveDisplayName(email, user.user_metadata?.full_name);

  const competitorCount = competitorsResult.data?.length ?? 0;
  const pageCount = pagesResult.data?.length ?? 0;

  return {
    email,
    displayName,
    initials: deriveInitials(displayName),
    plan,
    competitorCount,
    pageCount,
    pageAllowance: LIMITS[plan].pagesPerCompetitor * Math.max(1, competitorCount),
  };
}
