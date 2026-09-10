import { redirect } from "next/navigation";
import { getAccount } from "@/features/account/queries";
import { getCompetitorsWithPages } from "@/features/competitors/queries";
import { LIMITS } from "@/features/plan/limits";
import { readCachedPageInsight } from "@/features/insights/generate";
import { getPageHistory } from "@/features/backfill/queries";
import type { InitialHistory } from "@/features/backfill/types";
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

  // Cache-only read of every page's baseline profile (no AI call), keyed by page
  // id. Passed to each PageIntel so a revisit hydrates instantly instead of
  // re-fetching and flashing a skeleton. The homepage's profile also feeds the
  // templated summary line below.
  const profiles = await Promise.all(competitor.pages.map((p) => readCachedPageInsight(p.id)));
  const initialProfiles = Object.fromEntries(competitor.pages.map((p, i) => [p.id, profiles[i]]));

  // Recent-history hydration for the second pill: read every page's stored change
  // rows up front (a cheap query — live-detected + already-archived changes, no
  // Wayback fetch). This lets the pill show its count and open instantly on every
  // visit, for live changes as well as archived ones. `backfilled` tells the pill
  // whether the heavy Wayback reconstruction has ever run: if not, the first
  // expand still kicks it off — but in the background, over the rows we already
  // show, instead of a blocking load.
  const histories = await Promise.all(competitor.pages.map((p) => getPageHistory(p.id)));
  const initialHistories: Record<string, InitialHistory> = Object.fromEntries(
    competitor.pages.map((p, i) => [p.id, { items: histories[i], backfilled: Boolean(p.backfilledAt) }]),
  );

  // Templated summary line — composed, NOT a new AI call. Reads the homepage's
  // already-cached baseline positioning (if any) and layers this-week activity +
  // freshness on top. If nothing is cached, the positioning clause is dropped.
  const homepage = competitor.pages.find((p) => p.pageType === "homepage") ?? competitor.pages[0];
  const insight = homepage ? initialProfiles[homepage.id] : null;

  const weekCount = competitor.pages.reduce((n, p) => n + activeChanges(p, now).length, 0);
  const checkedTimes = competitor.pages
    .map((p) => p.lastCheckedAt)
    .filter((t): t is string => Boolean(t));
  const lastChecked = checkedTimes.length
    ? checkedTimes.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
    : null;

  // Other competitors' page URLs — the account-wide duplicate check in the Edit
  // dialog (this competitor's own pages are being edited, so they're excluded).
  const otherUrls = competitors
    .filter((c) => c.id !== id)
    .flatMap((c) => c.pages.map((p) => ({ url: p.url, competitor: c.name })));

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
      plan={account.plan}
      otherUrls={otherUrls}
      summaryLine={summaryLine}
      initialProfiles={initialProfiles}
      initialHistories={initialHistories}
      now={now}
    />
  );
}
