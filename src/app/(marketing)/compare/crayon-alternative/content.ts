// Copy for the Crayon-alternative comparison page. FAQ feeds both the visible
// section and the FAQPage JSON-LD. Competitor claims are positioning-level
// (durable), not spec/price specifics that could be wrong or go stale — see the
// "Last reviewed" note on the page.

export const LAST_REVIEWED = "September 2026";

// Left = Crayon (durable positioning), right = TrailWatch.
export const COMPARE: Array<{ them: string; us: string }> = [
  {
    them: "Enterprise competitive-intelligence platform for sales & PMM teams",
    us: "A focused competitor tracker for founders and small teams",
  },
  {
    them: "Battlecards, win/loss, market intelligence, sales enablement",
    us: "One job: tell you what your competitors changed",
  },
  {
    them: "Bought through demos and sales calls, onboarded over weeks",
    us: "Self-serve — sign up and add a competitor in a couple of minutes",
  },
  {
    them: "Seat-based enterprise contracts, custom pricing",
    us: "A free plan and one flat Pro plan — no “contact sales”",
  },
  {
    them: "A platform your team logs into and maintains",
    us: "One low-noise digest email a week — nothing to babysit",
  },
  {
    them: "Built for a competitive-intelligence function",
    us: "Built for the founder who is the competitive-intelligence function",
  },
];

export const WHERE_CRAYON_FITS = {
  heading: "Where Crayon is a great fit",
  body: "Crayon is a mature, enterprise-grade competitive-intelligence platform. If you have a dedicated product-marketing or competitive-intelligence team that needs battlecards, win/loss analysis, sales enablement, and broad market tracking — and the budget and time to onboard a platform — it does a lot that a lightweight tool deliberately doesn't. That breadth is the difference below, not a criticism.",
};

export const WHERE_TRAILWATCH_DIFFERS = {
  heading: "Where TrailWatch is different",
  body: "TrailWatch isn't a competitive-intelligence suite — it does one job well. You add a competitor's pricing, homepage, or changelog pages; we check them daily, filter out trivial edits, and send one plain-English email a week on what actually changed. No sales call to get started, no platform to maintain, no per-seat enterprise contract — just a free plan and one flat Pro price. It's for the founder who needs to stay on top of competitors without hiring a CI team.",
};

export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Is TrailWatch a good Crayon alternative?",
    a: "For a founder or small team who mainly needs to know when competitors change their pricing, messaging, or features — without buying an enterprise platform — yes. If you need battlecards, win/loss, and sales enablement across a large go-to-market team, a full competitive-intelligence suite like Crayon is aimed at that; TrailWatch intentionally isn't.",
  },
  {
    q: "What's the main difference?",
    a: "Scope and buyer. Crayon is an enterprise competitive-intelligence platform sold to sales and product-marketing teams. TrailWatch is a self-serve competitor-change tracker for founders: it watches the pages you pick and emails one plain-English digest a week — no dashboard to maintain.",
  },
  {
    q: "Do I have to talk to sales to use TrailWatch?",
    a: "No. There's a free plan (no card required) — sign up, add a competitor or two, and you'll get your first weekly digest. No demo or sales call required.",
  },
  {
    q: "How much does TrailWatch cost?",
    a: "A free plan, then a single Pro plan at $19/mo or $190/yr (two months free). Flat pricing, not a custom enterprise quote.",
  },
  {
    q: "Are the AI summaries included?",
    a: "Yes — AI summaries are on every plan, including free. They're the core of the product: a plain-English read on what changed, not a raw diff.",
  },
];
