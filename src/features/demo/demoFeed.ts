import type { CompetitorRow } from "@/features/competitors/queries";
import type { ChangeDetail } from "@/features/changes/queries";
import { domainOf, formatFullDate, formatShortDate } from "@/app/(app)/dashboard/dashboardFeed";

// Curated, display-only demo content for the Seeded Demo Dashboard (SPEC Fix 2).
//
// This is the founder's own content, lifted from the design prototype
// (trailwatch v2/Competitor Radar.dc.html, SEED) — real, not fabricated. It is
// NEVER written to the DB, monitored, or counted toward plan limits: it only
// renders when a user has zero competitors, and vanishes the instant they add
// their first real one.
//
// Timestamps are stored as offsets (`hoursAgo`) from "now", not fixed dates, so
// entries always read as recent and stay inside the "this week" window; the
// before/after dates on the detail page are derived from the same offsets.

type DemoChange = {
  summary: string;
  hoursAgo: number;
  meaningful?: boolean; // default true; false = a trivial edit, counted-but-unshown
  before?: string;
  after?: string;
  ignored?: string; // trailing sentence of the "excerpt only…" note
};
type DemoPage = { label: string; url: string; active?: boolean; changes: DemoChange[] };
type DemoCompetitor = { name: string; pages: DemoPage[] };

const CURATED: DemoCompetitor[] = [
  {
    name: "Linear",
    pages: [
      {
        label: "Pricing",
        url: "https://linear.app/pricing",
        changes: [
          {
            summary:
              "Linear raised the Business plan from $14 to $16 per user per month and introduced a 250 GB workspace file cap.",
            hoursAgo: 48,
            before: "Business — $14 per user / month, billed annually. Unlimited file uploads.",
            after: "Business — $16 per user / month, billed annually. 250 GB workspace file storage.",
            ignored: "4 other edits on this page were ignored as boilerplate.",
          },
        ],
      },
      {
        label: "Changelog",
        url: "https://linear.app/changelog",
        changes: [
          {
            summary:
              "Shipped a customer-request inbox that turns support emails into triaged issues without a Zapier step.",
            hoursAgo: 96,
            before: "Latest: Improved sub-issue drag behaviour in the board view.",
            after:
              "New: Customer Requests inbox — forward support email to a workspace address and Linear drafts a triaged issue.",
            ignored: "Two typo fixes on older entries were ignored.",
          },
        ],
      },
      { label: "Homepage", url: "https://linear.app", active: false, changes: [] },
    ],
  },
  {
    name: "Notion",
    pages: [
      {
        label: "Pricing",
        url: "https://notion.so/pricing",
        changes: [
          {
            summary:
              "Notion AI is now bundled into the Business plan and the $10 standalone AI add-on row was removed entirely.",
            hoursAgo: 72,
            before: "Notion AI — add to any plan for $10 per member / month.",
            after: "Notion AI — included with Business and Enterprise. No separate add-on.",
            ignored: "Currency-switcher markup changes were ignored.",
          },
        ],
      },
      {
        label: "Blog",
        url: "https://notion.so/blog",
        changes: [{ summary: "Footer year and cookie-banner copy tweaked.", hoursAgo: 60, meaningful: false }],
      },
      {
        label: "Changelog",
        url: "https://notion.so/releases",
        changes: [
          {
            summary: "Database views can now be shared as read-only public links with a per-link expiry date.",
            hoursAgo: 144,
            before: "Public links are permanent until revoked by a workspace admin.",
            after: "Set an expiry on any public database link — 24 hours, 7 days, or a custom date.",
            ignored: "Release-note reordering was ignored.",
          },
        ],
      },
    ],
  },
  {
    name: "Vercel",
    pages: [
      {
        label: "Pricing",
        url: "https://vercel.com/pricing",
        changes: [
          {
            summary: "Vercel cut the Pro plan's included bandwidth from 1 TB to 100 GB and now bills overage at $0.15 per GB.",
            hoursAgo: 144,
            before: "Pro — includes 1 TB bandwidth per month. Additional usage billed at $0.10 / GB.",
            after: "Pro — includes 100 GB bandwidth per month. Additional usage billed at $0.15 / GB.",
            ignored: "31 trivial edits across your pages were filtered out the same week.",
          },
        ],
      },
      {
        label: "Changelog",
        url: "https://vercel.com/changelog",
        changes: [
          {
            summary: "Fluid compute is now the default for new projects, replacing per-request isolate billing.",
            hoursAgo: 20,
            before: "Fluid compute is available as an opt-in setting per project.",
            after: "Fluid compute is enabled by default on all new projects created after this week.",
            ignored: "Author avatars and dates were ignored.",
          },
          { summary: "Minor wording tweaks across older entries.", hoursAgo: 30, meaningful: false },
        ],
      },
    ],
  },
];

function detectedIso(now: number, hoursAgo: number): string {
  return new Date(now - hoursAgo * 60 * 60 * 1000).toISOString();
}

// Shapes the curated set into the CompetitorRow[] the real feed renders.
export function getDemoFeed(now: number): CompetitorRow[] {
  return CURATED.map((c, ci) => ({
    id: `demo-${ci}`,
    name: c.name,
    createdAt: new Date(now).toISOString(),
    pages: c.pages.map((p, pi) => ({
      id: `demo-${ci}-${pi}`,
      url: p.url,
      label: p.label,
      isActive: p.active ?? true,
      lastCheckedAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      changes: p.changes.map((ch, chi) => ({
        id: `demo-${ci}-${pi}-${chi}`,
        summary: ch.summary,
        isMeaningful: ch.meaningful ?? true,
        detectedAt: detectedIso(now, ch.hoursAgo),
      })),
    })),
  }));
}

// One demo change, by its generated id, as the shared ChangeDetail view-model.
// Returns null for trivial (unshown) changes or a bad id.
export function getDemoChangeDetail(id: string, now: number): ChangeDetail | null {
  const m = /^demo-(\d+)-(\d+)-(\d+)$/.exec(id);
  if (!m) return null;
  const [ci, pi, chi] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const comp = CURATED[ci];
  const page = comp?.pages[pi];
  const change = page?.changes[chi];
  if (!comp || !page || !change || change.meaningful === false) return null;

  const detected = detectedIso(now, change.hoursAgo);
  const before = detectedIso(now, change.hoursAgo + 24 * 7); // ~a week earlier

  return {
    competitorName: comp.name,
    pageLabel: page.label,
    url: page.url,
    domain: domainOf(page.url),
    summary: change.summary,
    detectedDate: formatFullDate(detected),
    beforeDate: formatShortDate(before),
    afterDate: formatShortDate(detected),
    before: change.before ?? "",
    after: change.after ?? "",
    ignoredNote: change.ignored ?? "",
  };
}
