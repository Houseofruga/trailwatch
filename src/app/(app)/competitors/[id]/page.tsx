import { redirect } from "next/navigation";
import { getAccount } from "@/features/account/queries";
import { getCompetitorsWithPages } from "@/features/competitors/queries";
import { LIMITS } from "@/features/plan/limits";
import { readCachedPageInsight } from "@/features/insights/generate";
import { activeChanges, timeAgo } from "@/app/(app)/dashboard/dashboardFeed";
import { CompetitorDetail } from "./CompetitorDetail";

// A first "Recent history" expand can fetch + summarize several Wayback captures;
// give it headroom over the default so it can't hit the function timeout.
export const maxDuration = 60;

export default async function CompetitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [account, competitors] = await Promise.all([getAccount(), getCompetitorsWithPages()]);
  if (!account) redirect("/login");

  const competitor = competitors.find((c) => c.id === id);
  if (!competitor) redirect("/competitors");

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  // Templated summary line — composed, NOT a new AI call. Reads the homepage's
  // already-cached baseline positioning (if any) and layers this-week activity +
  // freshness on top. If nothing is cached, the positioning clause is dropped.
  const homepage = competitor.pages.find((p) => p.pageType === "homepage") ?? competitor.pages[0];
  const insight = homepage ? await readCachedPageInsight(homepage.id) : null;

  const weekCount = competitor.pages.reduce((n, p) => n + activeChanges(p, now).length, 0);
  const checkedTimes = competitor.pages
    .map((p) => p.lastCheckedAt)
    .filter((t): t is string => Boolean(t));
  const lastChecked = checkedTimes.length
    ? checkedTimes.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
    : null;

  const pageCount = competitor.pages.length;
  const parts: string[] = [];
  if (insight?.summary?.trim()) {
    const pos = insight.summary.trim();
    parts.push(pos.endsWith(".") ? pos : `${pos}.`);
  }
  const activity = weekCount > 0 ? `${weekCount} change${weekCount === 1 ? "" : "s"} this week` : "all quiet this week";
  parts.push(`${pageCount} page${pageCount === 1 ? "" : "s"} tracked — ${activity}.`);
  if (lastChecked) parts.push(`Checked ${timeAgo(lastChecked, now)}.`);
  const summaryLine = parts.join(" ");

  return (
    <CompetitorDetail
      competitor={competitor}
      pagesPerCompetitor={LIMITS[account.plan].pagesPerCompetitor}
      summaryLine={summaryLine}
      now={now}
    />
  );
}
