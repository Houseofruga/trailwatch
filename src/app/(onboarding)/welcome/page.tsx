import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccount } from "@/features/account/queries";
import { getCompetitorsWithPages } from "@/features/competitors/queries";
import { LIMITS } from "@/features/plan/limits";
import { WelcomeOnboarding } from "./WelcomeOnboarding";

export const metadata: Metadata = { title: "Set up your watchlist" };

// Post-signup onboarding: confirm and create the competitors the visitor picked
// on /try (carried in localStorage). Only for fresh accounts — anyone who already
// has competitors is sent to the dashboard.
export default async function WelcomePage() {
  const supabase = await createClient();
  const [account, competitors, { data: { user } }] = await Promise.all([
    getAccount(),
    getCompetitorsWithPages(),
    supabase.auth.getUser(),
  ]);
  if (!account || !user) redirect("/login");
  if (competitors.length > 0) redirect("/dashboard");

  return (
    <WelcomeOnboarding
      plan={account.plan}
      limit={LIMITS[account.plan].competitors}
      email={account.email}
      userId={user.id}
    />
  );
}
