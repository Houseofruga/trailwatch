// FAQ content for the landing. The same array feeds the visible <details> list
// and the FAQPage JSON-LD, so the structured data always matches what's on the
// page (a requirement for FAQ rich results).

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://gettrailwatch.com";

export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "What does TrailWatch do?",
    a: "You add a competitor's public pages — pricing, homepage, changelog. TrailWatch checks them daily, filters out trivial edits, and emails you one plain-English digest a week summarizing what actually changed.",
  },
  {
    q: "How is this different from a raw diff or Google Alerts?",
    a: "The whole point is low noise. Instead of a wall of red-and-green diffs, you get a short, readable summary of the meaningful changes — and trivial edits like reworded footers or timestamps are filtered out before they ever reach you.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes. The free plan covers 2 competitors and 6 pages, with AI summaries included — the AI is never behind a paywall. No card required to start.",
  },
  {
    q: "How much is Pro, and what do I get?",
    a: "Pro is $19/month, or $190/year (two months free). It raises your limits to 10 competitors and 100 pages, with daily checks and the same weekly digest.",
  },
  {
    q: "How often are pages checked?",
    a: "Pages are checked daily. You receive a single digest email once a week, so you stay informed without a stream of alerts to manage.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can cancel from your billing settings at any time and keep Pro access until the end of the period you've already paid for. After that your account returns to the free plan.",
  },
];

/** Combined JSON-LD graph: who we are, what the product is, and the FAQ. */
export function structuredData(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "House of Ruga",
        url: "https://houseofruga.com",
        brand: "TrailWatch",
        email: "trailwatch@houseofruga.com",
      },
      {
        "@type": "SoftwareApplication",
        name: "TrailWatch",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description:
          "TrailWatch watches your competitors' public pages and emails you one plain-English digest a week explaining what actually changed. AI summaries on every plan, even free.",
        publisher: { "@id": `${SITE_URL}/#organization` },
        offers: [
          {
            "@type": "Offer",
            name: "Free",
            price: "0",
            priceCurrency: "USD",
          },
          {
            "@type": "Offer",
            name: "Pro (monthly)",
            price: "19",
            priceCurrency: "USD",
          },
          {
            "@type": "Offer",
            name: "Pro (annual)",
            price: "190",
            priceCurrency: "USD",
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };
}
