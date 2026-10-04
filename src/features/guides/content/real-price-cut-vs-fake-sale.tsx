import Link from "next/link";
import type { Guide } from "../types";

// G3 (SEO_PLAN.md): search intent "fake sale prices", "compare at price".
// Example brands are fictional; the table's numbers are marked as an illustration.

export const realPriceCutVsFakeSale: Guide = {
  slug: "real-price-cut-vs-fake-sale",
  title: "How to tell a real price cut from a fake “sale” price",
  crumb: "Real cuts vs fake sales",
  summary:
    "A crossed-out price doesn’t always mean the price went down. Here’s how to check whether a competitor’s sale is a real cut, and why it matters for your own pricing.",
  cardSummary: "How to check whether a competitor’s crossed-out price is a real cut.",
  group: "black-friday",
  date: "2026-10-05",
  readMinutes: 6,
  author: "chandan",
  related: ["track-competitor-black-friday-sales", "track-competitor-prices-shopify"],
  blocks: [
    { type: "h2", id: "why", text: "Why this matters to you" },
    {
      type: "p",
      text: "When a competitor shows “$60, was $80”, there are two very different things that could be going on. Either the product really sold at $80 last week and they’ve cut it, or it has been $60 for months and the $80 is there to make $60 look good.",
    },
    {
      type: "p",
      text: "The first is a move you might need to answer. The second is their normal price, and matching it means cutting your margin to follow a discount that never happened.",
    },

    { type: "h2", id: "how-it-works", text: "How a “sale” price works on Shopify" },
    {
      type: "p",
      text: "Every product on a Shopify store has a price. It can also have a second, optional number called the compare-at price. When the compare-at price is higher than the price, most store designs show it crossed out, with a “Sale” label.",
    },
    {
      type: "p",
      text: "The store owner types in both numbers. Nothing checks that the product was ever sold at the compare-at price. So the crossed-out number tells you what the store wants you to compare against, not what the price used to be.",
    },

    { type: "h2", id: "signs", text: "Four signs a sale price isn’t a real cut" },
    {
      type: "ol",
      items: [
        <>
          <strong>It never ends.</strong> The same product has shown the same crossed-out price every time you’ve looked for months.
        </>,
        <>
          <strong>Most of the catalog is “on sale”.</strong> If nearly everything carries a discount on an ordinary Tuesday, the discount is the
          real price.
        </>,
        <>
          <strong>The product launched on sale.</strong> A brand-new product with a crossed-out price was never sold at the higher one.
        </>,
        <>
          <strong>The “was” price went up.</strong> The price you pay stayed the same, but the crossed-out number grew, so the discount looks
          bigger.
        </>,
      ],
    },

    { type: "h2", id: "check", text: "How to check a specific product" },
    { type: "h3", text: "Look at an old copy of the page" },
    {
      type: "p",
      text: "The Wayback Machine keeps old copies of public web pages. Paste in the product’s address and pick a date a few months back. If the price then is the same as the “sale” price now, nothing was cut.",
    },
    { type: "h3", text: "Look at the store’s public product list" },
    {
      type: "p",
      text: "Many Shopify stores publish their product list at a public address. It shows the price and the compare-at price for every product, so you can see how much of the catalog is marked down in one go:",
    },
    { type: "code", text: "dewlane.com/products.json" },
    {
      type: "p",
      text: (
        <>
          You don’t have to read that page yourself. The <Link href="/tools/sale-checker">free sale checker</Link> reads it for you and tells you
          how many products are discounted and by how much.
        </>
      ),
    },
    { type: "h3", text: "Keep your own record" },
    {
      type: "p",
      text: "The most reliable check is a record you made yourself. Note the price of the products you care about today. When a sale appears, you’ll know what the price was before it.",
    },
    {
      type: "table",
      caption: "An example record for one product. The brand and numbers are made up for illustration.",
      head: [{ label: "Date" }, { label: "Price", numeric: true }, { label: "Crossed-out price", numeric: true }, { label: "What it means" }],
      rows: [
        ["Sep 1", "$60", "$80", "Already shown as on sale"],
        ["Oct 1", "$60", "$80", "No change in a month: $60 is the normal price"],
        ["Nov 24", "$60", "$95", "The “was” price went up, the real price didn’t"],
        ["Nov 27", "$48", "$95", "A real cut: $12 less than the normal price"],
      ],
    },
    {
      type: "p",
      text: "In this example the store would advertise “almost 50% off” on November 27. Against the price people were actually paying, it’s 20% off. That’s the number to weigh your own response against.",
    },

    { type: "h2", id: "respond", text: "What to do about it" },
    {
      type: "ul",
      items: [
        <>
          <strong>Compare against their normal price,</strong> not their crossed-out one. Your baseline tells you which is which.
        </>,
        <>
          <strong>Don’t match a discount that isn’t real.</strong> If their price hasn’t moved, yours doesn’t need to.
        </>,
        <>
          <strong>Do react to real cuts</strong> on products that compete with your best sellers.
        </>,
        <>
          <strong>Keep your own “was” prices honest.</strong> In the US, the FTC’s pricing guides say a former price should be one the product
          was really offered at for a reasonable length of time. This isn’t legal advice, but it’s also simply better for trust.
        </>,
      ],
    },

    { type: "h2", id: "automatic", text: "Let the record keep itself" },
    {
      type: "p",
      text: "Trailwatch reads each competitor’s catalog every few hours and keeps the history. A sale of 20% or more reaches you as an alert within hours, and smaller price changes are collected in your Monday briefing. Both show the price before and after, so you’re not relying on the store’s own crossed-out number.",
    },
    {
      type: "alertFigure",
      store: "Dewlane",
      when: "3h ago",
      title: "Sale started on 14 products",
      detail: "Linen duvet cover went from $60 to $48. The crossed-out price was already $95 before the cut.",
      caption: "An example Trailwatch alert. It reports the change in the price people pay, not the advertised discount.",
    },
  ],
  faq: [
    {
      q: "What is a compare-at price?",
      a: "It’s an optional second price a Shopify store owner can set on a product. When it’s higher than the selling price, the store shows it crossed out, so the product looks discounted.",
    },
    {
      q: "Is a permanent “sale” price illegal?",
      a: "It can be. In the US, the FTC’s pricing guides say a former price should be a real one the product was offered at for a reasonable time, and some states have their own rules. If you’re setting your own prices, ask a lawyer. This guide isn’t legal advice.",
    },
    {
      q: "How can I see a competitor’s past prices?",
      a: "Check old copies of the product page on the Wayback Machine, or keep your own record from today. Stores don’t publish their price history.",
    },
    {
      q: "Should I use compare-at prices on my own store?",
      a: "Yes, when the higher price is real: the product sold at it recently and for a meaningful stretch. Shoppers who notice a sale that never ends stop believing any of your discounts.",
    },
  ],
};
