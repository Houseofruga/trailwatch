import { redirect } from "next/navigation";
import { getAccount } from "@/features/account/queries";
import { getCompetitorsWithPages } from "@/features/competitors/queries";
import { LIMITS } from "@/features/plan/limits";
import { AddCompetitorTakeover } from "@/app/(app)/competitors/add/AddCompetitorTakeover";

// Intercepts in-app navigation to /competitors/add and shows the Add Competitor
// flow as a full-screen takeover over the current page (dashboard / competitors),
// scrimmed behind. A hard visit / refresh isn't intercepted and renders the full
// page (competitors/add/page.tsx) instead.
export default async function AddCompetitorModal() {
  const [account, competitors] = await Promise.all([getAccount(), getCompetitorsWithPages()]);
  if (!account) redirect("/login");

  const limits = LIMITS[account.plan];
  const existingUrls = competitors.flatMap((c) => c.pages.map((p) => ({ url: p.url, competitor: c.name })));

  return (
    <AddCompetitorTakeover
      variant="overlay"
      plan={account.plan}
      competitorCount={competitors.length}
      competitorCap={limits.competitors}
      pagesPerCompetitor={limits.pagesPerCompetitor}
      existingUrls={existingUrls}
    />
  );
}
