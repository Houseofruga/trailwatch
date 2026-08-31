// Copy for the Visualping-alternative comparison page. FAQ feeds both the
// visible section and the FAQPage JSON-LD so they stay in sync. Competitor
// claims are deliberately positioning-level (durable), not spec/price specifics
// that could be wrong or go stale — see the "Last reviewed" note on the page.

export const LAST_REVIEWED = "September 2026";

// Left = Visualping (durable positioning), right = TrailWatch.
export const COMPARE: Array<{ them: string; us: string }> = [
  {
    them: "General-purpose website change monitor for any page",
    us: "Purpose-built for tracking competitors, for founders and small teams",
  },
  {
    them: "Shows you visual diffs — you read the change yourself",
    us: "Plain-English AI summary of what changed and why it matters",
  },
  {
    them: "A dashboard and alerts to keep an eye on",
    us: "One low-noise digest email a week — nothing to babysit",
  },
  {
    them: "Trivial edits can create noisy alerts",
    us: "A noise filter drops cosmetic changes before they reach you",
  },
  {
    them: "Advanced/AI features tend to sit on higher paid tiers",
    us: "AI summaries on every plan, even the free one",
  },
  {
    them: "Priced by checks/pages, scaling as you monitor more",
    us: "One flat, honest price — free tier, then a single Pro plan",
  },
];

export const WHERE_VISUALPING_FITS = {
  heading: "Where Visualping is a great fit",
  body: "Visualping is a capable, general-purpose website-change monitor. If you need to watch arbitrary pages across many sites — internal pages, documentation, listings, government or compliance pages — and you want to see the exact visual diff yourself, it does that well and has for years. It isn't specifically a competitor-intelligence product, and that's the point of difference below, not a knock on the tool.",
};

export const WHERE_TRAILWATCH_DIFFERS = {
  heading: "Where TrailWatch is different",
  body: "TrailWatch does one thing for one kind of person: it tells founders what their competitors changed. You add a competitor's pricing, homepage, or changelog pages; we check them daily, filter out the trivial edits, and send one plain-English email a week summarizing what actually moved. There's no dashboard to check and no AI paywall — the summaries are on every plan, including free. It's the low-noise, founder-priced take on competitor monitoring.",
};

export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Is TrailWatch a good Visualping alternative?",
    a: "If your goal is specifically tracking competitors — and you'd rather get a short, plain-English weekly summary than watch a dashboard of visual diffs — yes. TrailWatch is built around that one job. If you need to monitor arbitrary pages of any kind, a general-purpose watcher like Visualping may suit you better.",
  },
  {
    q: "What's the main difference?",
    a: "Focus and output. Visualping is a general page-change monitor that shows you diffs; TrailWatch is a competitor-tracking tool that summarizes changes in plain English, filters out trivial edits, and delivers one low-noise email a week — no dashboard to babysit.",
  },
  {
    q: "Are the AI summaries free?",
    a: "Yes. TrailWatch includes AI summaries on every plan, including the free tier — they're the core of the product, not an upsell. The free plan covers 2 competitors and 6 pages with a weekly digest.",
  },
  {
    q: "How much does TrailWatch cost?",
    a: "There's a free plan (no card required) and a single Pro plan at $19/mo, or $190/yr (two months free). Flat pricing — you're not metered by the number of checks or pages the way many monitors are.",
  },
  {
    q: "Can I try it before switching?",
    a: "Yes — start free, add a competitor or two, and see your first weekly digest. No card required, and you can cancel a paid plan anytime.",
  },
];
