import Link from "next/link";
import type { Guide } from "../types";

// G5 (SEO_PLAN.md): search intent "see competitor new products".
// Example brands are fictional.

export const seeCompetitorNewProducts: Guide = {
  slug: "see-competitor-new-products",
  title: "How to see a competitor’s new products as soon as they launch",
  crumb: "Spotting new products",
  summary:
    "Four places a competitor’s new product shows up before most people notice it, and how to get told about a launch without checking their store.",
  cardSummary: "Where a competitor’s new product shows up first, and how to get told.",
  group: "evergreen",
  date: "2026-10-05",
  readMinutes: 5,
  author: "chandan",
  related: ["find-competitor-best-sellers", "track-competitor-prices-shopify"],
  blocks: [
    { type: "h2", id: "why", text: "Why launches are worth watching" },
    {
      type: "p",
      text: "A competitor’s new product tells you where they think the category is going. It can also take sales from you directly if it lands next to one of your best sellers. Hearing about it on launch day gives you time to respond. Hearing about it from a customer a month later doesn’t.",
    },

    { type: "h2", id: "where", text: "Four places a new product shows up" },
    { type: "h3", text: "1. The “new” collection" },
    {
      type: "p",
      text: "Most stores have a collection for new arrivals, linked from the main menu. Its address is usually something like:",
    },
    { type: "code", text: "fernwoodsupply.com/collections/new-arrivals" },
    {
      type: "p",
      text: "The store chooses what goes in it, so it can be out of date or miss quiet additions.",
    },
    { type: "h3", text: "2. The full catalog, newest first" },
    {
      type: "p",
      text: "Most Shopify stores have a page that lists every product. Adding a sort option to the address puts the newest at the top:",
    },
    { type: "code", text: "fernwoodsupply.com/collections/all?sort_by=created-descending" },
    {
      type: "p",
      text: "This catches products the store hasn’t promoted yet. Some store designs ignore the sort option, in which case the order won’t change.",
    },
    { type: "h3", text: "3. The public product list" },
    {
      type: "p",
      text: (
        <>
          Many Shopify stores publish their product list at a public address, and each product in it carries the date it was published. That’s the
          most exact record of what’s new. The <Link href="/tools/store-snapshot">free store snapshot</Link> reads this list and gives you a
          summary of the catalog:
        </>
      ),
    },
    { type: "tool" },
    { type: "h3", text: "4. Email and social" },
    {
      type: "p",
      text: "Sign up to their email list and follow their main social account. Launches are announced there, though often a day or more after the product is live on the store.",
    },

    { type: "h2", id: "early", text: "Signs a launch is coming" },
    {
      type: "ul",
      items: [
        "A “coming soon” page or a waitlist sign-up",
        "A new category appearing in the main menu",
        "A new product listed as sold out before anyone could have bought it",
        "New ads for a product you can’t find on the store yet. Meta’s Ad Library shows any brand’s active ads",
      ],
    },

    { type: "h2", id: "read", text: "What a launch tells you" },
    {
      type: "p",
      text: "When you spot a new product, note four things:",
    },
    {
      type: "ol",
      items: [
        <>
          <strong>The category.</strong> Is it in a category you sell in, or a new one for them?
        </>,
        <>
          <strong>The price.</strong> Is it above or below their usual range, and where does it sit next to your closest product?
        </>,
        <>
          <strong>The launch offer.</strong> Full price, a launch discount or a bundle?
        </>,
        <>
          <strong>The stock.</strong> If it sells out within days, demand is real. If it’s discounted within weeks, it probably isn’t.
        </>,
      ],
    },
    {
      type: "tip",
      text: "One launch is a data point. Three launches in the same category in a few months is a direction.",
    },

    { type: "h2", id: "alerts", text: "Get told on launch day" },
    {
      type: "p",
      text: "Trailwatch reads each competitor’s catalog every few hours. When a product appears that wasn’t there before, you get an alert with the product, its price and its category. Your Monday briefing then puts the week’s launches next to your own products.",
    },
    {
      type: "alertFigure",
      store: "Fernwood Supply",
      when: "1h ago",
      title: "New product: Travel candle set, $34",
      detail: "Added to Candles this morning. It’s their first product under $40 in that category.",
      caption: "An example Trailwatch alert for a launch. You see the product, the price and the category.",
    },
  ],
  faq: [
    {
      q: "How quickly can I find out about a competitor’s launch?",
      a: "By hand, as quickly as you check. With Trailwatch, within a few hours of the product going live on their store, since catalogs are read several times a day.",
    },
    {
      q: "Can I see products a competitor hasn’t published yet?",
      a: "No. Unpublished products aren’t public, and Trailwatch only reads what any shopper can see. You can sometimes spot signs of a coming launch, like a waitlist page or new ads.",
    },
    {
      q: "What if the competitor isn’t on Shopify?",
      a: "Use their new arrivals page, their emails and their social accounts. The sorted catalog address and the public product list in this guide are Shopify features.",
    },
    {
      q: "Do new colors or sizes count as a launch?",
      a: "They’re a smaller signal, though a new color of a best seller usually means it’s selling well. Trailwatch alerts you to brand-new products. A new color or size added to an existing product doesn’t trigger an alert.",
    },
  ],
};
