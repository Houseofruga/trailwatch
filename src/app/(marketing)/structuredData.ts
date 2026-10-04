// FAQ content for the landing. The same array feeds the visible <details> list
// and the FAQPage JSON-LD, so the structured data always matches what's on the
// page (a requirement for FAQ rich results).

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://gettrailwatch.com";

export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "What does Trailwatch do?",
    a: "You add the stores you compete with. Trailwatch tracks their products, prices, sales, stock and key pages, alerts you when they make a big move, and sends a plain-English briefing every Monday on what changed, what it means for you, and what to do about it.",
  },
  {
    q: "How is this different from price trackers or spy tools?",
    a: "Price trackers are built to reprice identical products, and spy tools give dropshippers raw numbers. Trailwatch is for brands selling their own products: it explains what competitors are doing (launches, promos, positioning) instead of handing you a spreadsheet.",
  },
  {
    q: "Which stores can I track?",
    a: "Shopify stores, where we can read the full catalog: every product, price, sale and stock change. Stores on other platforms and marketplaces like Amazon aren't supported, so add the brand's own Shopify store.",
  },
  {
    q: "How quickly will I hear about changes?",
    a: "Big moves, like a sale starting or a bestseller selling out, reach you within hours. Everything else lands in your Monday briefing, so you're never flooded.",
  },
  {
    q: "Do I need to install anything on my store?",
    a: "No. Trailwatch only looks at competitors' public storefronts. Nothing is installed on your store or theirs.",
  },
  {
    q: "Will my competitors know I'm watching them?",
    a: "No. Trailwatch only reads their public storefront, the same pages any visitor sees. Nothing is installed on their store, they aren't notified, and they can't see who's tracking them.",
  },
  {
    q: "Is the beta really free? What happens after?",
    a: "Yes, free with no card. When paid plans launch, we'll tell you well in advance, and beta members keep 40% off for life. You can leave anytime.",
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
        brand: "Trailwatch",
        email: "trailwatch@houseofruga.com",
      },
      {
        "@type": "SoftwareApplication",
        name: "Trailwatch",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description:
          "Competitor briefings for Shopify brands: your competitors' launches, price cuts, sales and sell-outs within hours, plus a plain-English briefing every Monday. Free during beta.",
        publisher: { "@id": `${SITE_URL}/#organization` },
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
