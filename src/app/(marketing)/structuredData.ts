// FAQ content for the landing. The same array feeds the visible <details> list
// and the FAQPage JSON-LD, so the structured data always matches what's on the
// page (a requirement for FAQ rich results).

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://gettrailwatch.com";

export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "What does TrailWatch do?",
    a: "You add the stores you compete with. TrailWatch tracks their products, prices, sales, stock and key pages, alerts you when they make a big move, and sends a plain-English briefing every Monday on what changed and what it means for you.",
  },
  {
    q: "How is this different from price trackers or spy tools?",
    a: "Price trackers are built to reprice identical products, and spy tools give dropshippers raw numbers. TrailWatch is for brands selling their own products: it explains what competitors are doing (launches, promos, positioning) instead of handing you a spreadsheet.",
  },
  {
    q: "Which stores can I track?",
    a: "It works best with Shopify stores, where we can read the full catalog. For other sites, we watch key pages like the homepage, sale pages and policies. Marketplaces like Amazon aren't supported yet, so add the brand's own website instead.",
  },
  {
    q: "How quickly will I hear about changes?",
    a: "Big moves, like a sale starting or a bestseller selling out, trigger an alert soon after we spot them. Everything else lands in your Monday briefing, so you're never flooded.",
  },
  {
    q: "Do I need to install anything on my store?",
    a: "No. TrailWatch only looks at competitors' public storefronts. Nothing is installed on your store or theirs.",
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
          "Competitor briefings for Shopify brands: track your competitors' products, prices, sales and stock, with instant alerts for big moves and a plain-English briefing every Monday. Free during beta.",
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
