// Copy for the Kompyte-alternative comparison page. FAQ feeds both the visible
// section and the FAQPage JSON-LD. Competitor claims are positioning-level
// (durable), not spec/price specifics that could be wrong or go stale — see the
// "Last reviewed" note on the page.

export const LAST_REVIEWED = "September 2026";

// Left = Kompyte (durable positioning), right = TrailWatch.
export const COMPARE: Array<{ them: string; us: string }> = [
  {
    them: "Enterprise competitive-intelligence & sales-enablement platform",
    us: "A focused competitor tracker for founders and small teams",
  },
  {
    them: "Automated battlecards, tracking, and enablement for go-to-market teams",
    us: "One job: tell you what your competitors changed, in plain English",
  },
  {
    them: "Bought via demos and sales calls, rolled out across a team",
    us: "Self-serve — sign up and add a competitor in a couple of minutes",
  },
  {
    them: "Custom, seat- or contract-based enterprise pricing",
    us: "A free plan and one flat Pro plan — no “contact sales”",
  },
  {
    them: "A dashboard and alert stream your team monitors",
    us: "One low-noise digest email a week — nothing to babysit",
  },
  {
    them: "Built for a competitive-intelligence function",
    us: "Built for the founder who is the competitive-intelligence function",
  },
];

export const WHERE_KOMPYTE_FITS = {
  heading: "Where Kompyte is a great fit",
  body: "Kompyte is an established, enterprise-grade competitive-intelligence and sales-enablement platform. If you have a go-to-market team that needs automated battlecards, competitor tracking wired into your sales process, and enablement content kept current at scale — with the budget and rollout time an enterprise tool assumes — it's built for exactly that. The breadth is the difference below, not a knock on it.",
};

export const WHERE_TRAILWATCH_DIFFERS = {
  heading: "Where TrailWatch is different",
  body: "TrailWatch isn't a sales-enablement platform — it does one job. You add a competitor's pricing, homepage, or changelog pages; we check them daily, filter out trivial edits, and send one plain-English email a week on what actually changed. No demo to get started, no seats to manage, no dashboard to keep an eye on — just a free plan and one flat Pro price. It's competitor awareness for the founder who doesn't have a CI team.",
};

export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Is TrailWatch a good Kompyte alternative?",
    a: "For a founder or small team who mainly wants to know when competitors change their pricing, messaging, or features — without an enterprise platform — yes. If you need automated battlecards and sales enablement across a go-to-market team, a full platform like Kompyte is aimed at that; TrailWatch intentionally keeps to one job.",
  },
  {
    q: "What's the main difference?",
    a: "Scope and buyer. Kompyte is an enterprise competitive-intelligence and enablement platform for go-to-market teams. TrailWatch is a self-serve competitor-change tracker for founders: it watches the pages you pick and emails one plain-English digest a week — nothing to maintain.",
  },
  {
    q: "Do I need a demo or sales call to start?",
    a: "No. TrailWatch has a free plan with no card required — sign up, add a competitor or two, and get your first weekly digest. No demo required.",
  },
  {
    q: "How much does TrailWatch cost?",
    a: "A free plan, then a single Pro plan at $19/mo or $190/yr (two months free). Flat, published pricing — not a custom enterprise quote.",
  },
  {
    q: "Are the AI summaries included on every plan?",
    a: "Yes — AI summaries are on every plan, including free. They're the heart of the product: a plain-English summary of what changed, not a raw diff you have to interpret.",
  },
];
