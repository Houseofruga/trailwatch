// Copy for the AI Competitor Teardown page. FAQ feeds both the visible section
// and the FAQPage JSON-LD so they stay in sync.

export const GUIDE: Array<{ heading: string; body: string }> = [
  {
    heading: "What a competitor teardown gives you",
    body: "Paste a competitor's URL and you get a plain-English read on three things: how they position themselves (who they're for, what they lead with), the pricing tiers we can find on their public pages, and a short 'what to watch' list — the pages and signals worth keeping an eye on. It's the 20-minute manual size-up, done in seconds.",
  },
  {
    heading: "1. Read the positioning first",
    body: "Positioning tells you who a competitor thinks their customer is and how they're trying to win them — value, simplicity, enterprise features, price. If it sounds a lot like yours, that's where the fight is. If it's aimed at a different buyer, you may be less head-to-head than you feared.",
  },
  {
    heading: "2. Compare the pricing tiers",
    body: "We surface the plan names and prices from their public pricing page when they're there. Look at where the tiers break — what's gated behind the paid plan, whether there's a free tier, how the annual discount is framed. Pricing is the single page most worth watching over time, because it moves.",
  },
  {
    heading: "3. Turn 'what to watch' into a habit",
    body: "A one-time teardown is a snapshot. Real competitive insight comes from noticing when a competitor changes something — a new plan, a repriced tier, a shipped feature, a shift in messaging. The 'what to watch' list is where to point your attention; TrailWatch can watch those pages for you and email you when they actually change.",
  },
];

export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Is the competitor teardown really free?",
    a: "Yes — no signup, no card. Paste a public URL and get an instant teardown. It's a taste of what TrailWatch does continuously: watch competitor pages and email you a plain-English digest when something meaningful changes.",
  },
  {
    q: "How does it work?",
    a: "We fetch a couple of the competitor's public pages (their homepage and, if we can find it, their pricing page), then use an AI model to summarize their positioning, pricing, and what's worth watching. We only read public, non-authenticated pages.",
  },
  {
    q: "Do you store the competitor's data?",
    a: "No. The teardown is generated on the fly from the public pages and shown to you — we don't save the page content. If you want ongoing tracking, that's what a free TrailWatch account is for.",
  },
  {
    q: "Why didn't it find pricing?",
    a: "Some sites keep pricing behind a 'contact sales' flow, load it with JavaScript we can't read, or put it at an unusual path. When we can't find real pricing in the public text, we say so rather than inventing numbers.",
  },
  {
    q: "How is this different from the paid product?",
    a: "The teardown is a one-shot snapshot. TrailWatch is the ongoing version: it watches the competitor pages you choose — every day — filters out trivial edits, and emails you one low-noise digest a week on what actually changed. AI summaries are on every plan, even free.",
  },
];
