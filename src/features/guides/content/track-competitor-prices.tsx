import Link from "next/link";
import type { Guide } from "../types";

// G4 (SEO_PLAN.md): search intent "track competitor prices shopify".
// Example brands are fictional; the table's numbers are marked as an illustration.

export const trackCompetitorPrices: Guide = {
  slug: "track-competitor-prices-shopify",
  title: "How to track a competitor’s prices on Shopify",
  crumb: "Tracking competitor prices",
  summary:
    "Three ways to keep an eye on a competitor’s prices, from a spreadsheet you fill in by hand to alerts that arrive on their own, and how to pick between them.",
  cardSummary: "Three ways to watch a competitor’s prices, and how to pick one.",
  group: "evergreen",
  date: "2026-10-05",
  readMinutes: 6,
  author: "chandan",
  related: ["real-price-cut-vs-fake-sale", "see-competitor-new-products"],
  blocks: [
    { type: "h2", id: "what", text: "Decide what you’re tracking first" },
    {
      type: "p",
      text: "You don’t need every price on a competitor’s store. You need the prices that sit next to yours when a shopper is choosing. Start with two short lists:",
    },
    {
      type: "ul",
      items: [
        <>
          <strong>Your top five products,</strong> and the closest product to each one on the competitor’s store
        </>,
        <>
          <strong>Their best sellers,</strong> even where you don’t have a direct match
        </>,
      ],
    },
    {
      type: "p",
      text: "For each product, three numbers are worth recording: the price, the crossed-out “was” price if there is one, and whether it’s in stock.",
    },

    { type: "h2", id: "by-hand", text: "Method 1: check by hand" },
    {
      type: "p",
      text: "Open each product page once a week and type the price into a spreadsheet, with one row per product and one column per week.",
    },
    {
      type: "table",
      caption: "An example price sheet. The brand, products and numbers are made up for illustration.",
      head: [{ label: "Product (Luna Skin)" }, { label: "Sep 28", numeric: true }, { label: "Oct 5", numeric: true }, { label: "Change" }],
      rows: [
        ["Daily cleanser, 150ml", "$24", "$24", "None"],
        ["Vitamin C serum, 30ml", "$42", "$36", "Down $6"],
        ["Night cream, 50ml", "$38", "$38", "None"],
        ["Starter set", "$79", "Sold out", "Out of stock"],
      ],
    },
    {
      type: "p",
      text: "This works for one or two competitors and a dozen products. It stops working when the list grows, or in the weeks when you’re too busy to do it, which are usually the weeks when prices move.",
    },

    { type: "h2", id: "product-list", text: "Method 2: read the store’s public product list" },
    {
      type: "p",
      text: "Many Shopify stores publish their whole product list at a public address. It has every product, each size or color, its price, its crossed-out price and whether it’s in stock. Add this ending to the store’s address:",
    },
    { type: "code", text: "lunaskin.com/products.json" },
    {
      type: "p",
      text: "The page is written for programs, so it’s hard to read by eye, and it shows 30 products at a time unless you ask for more. To get up to 250 at once, and then the next 250:",
    },
    { type: "code", text: "lunaskin.com/products.json?limit=250&page=2" },
    {
      type: "p",
      text: (
        <>
          Not every store leaves this list open, and it only exists on Shopify. Our{" "}
          <Link href="/tools/shopify-store-checker">free Shopify store checker</Link> tells you whether a store is on Shopify and whether its list
          is public. For a readable summary of the catalog, with product count, sale share and price range, use the store snapshot:
        </>
      ),
    },
    { type: "tool" },
    {
      type: "tip",
      text: "The product list shows today’s prices only. To see a change, you have to save a copy and compare it with the next one.",
    },

    { type: "h2", id: "alerts", text: "Method 3: get alerts" },
    {
      type: "p",
      text: "The first two methods share a weakness: you only find out when you look. A tracking tool does the looking on a schedule, keeps every copy and tells you what changed.",
    },
    {
      type: "p",
      text: "Trailwatch does this for Shopify competitors. It reads each catalog every few hours and compares it with the last copy. A sale of 20% or more reaches you as an alert within hours. Smaller price changes are collected in your Monday briefing, each with the price before and after.",
    },
    {
      type: "alertFigure",
      store: "Luna Skin",
      when: "4h ago",
      title: "Sale started: Vitamin C serum, $42 to $32",
      detail: "24% off their best seller. It now sits $8 below your closest product.",
      caption: "An example Trailwatch alert for a sale, with what it means next to your own product.",
    },

    { type: "h2", id: "choose", text: "Which method to choose" },
    {
      type: "table",
      caption: "The three methods compared.",
      head: [{ label: "Method" }, { label: "Good for" }, { label: "Weekly time" }, { label: "Main weakness" }],
      rows: [
        ["By hand", "1 to 2 competitors, a dozen products", "30 to 60 minutes", "Gets skipped when you’re busy"],
        ["Public product list", "A one-off look at a whole catalog", "Varies", "No history unless you save copies"],
        ["Alerts and a weekly briefing", "3 or more competitors, all year", "A few minutes", "Works for Shopify stores only"],
      ],
    },

    { type: "h2", id: "act", text: "What to do when a price changes" },
    {
      type: "ul",
      items: [
        <>
          <strong>Check whether it’s a real cut.</strong> Compare with the price last week, not the crossed-out price.
        </>,
        <>
          <strong>Check which product it is.</strong> A cut on something that competes with your best seller matters more than one on a slow
          product.
        </>,
        <>
          <strong>Wait a few days before matching.</strong> Short promotions often end on their own.
        </>,
        <>
          <strong>Notice price rises too.</strong> When a competitor puts prices up, you may have room to do the same.
        </>,
      ],
    },
  ],
  faq: [
    {
      q: "Is it legal to track a competitor’s prices?",
      a: "Reading prices that a store shows to every shopper is ordinary market research. Trailwatch only reads public pages, doesn’t log in and respects a store’s rules for automated visitors.",
    },
    {
      q: "How often do Shopify stores change prices?",
      a: "It varies a lot. Many change a few prices a month, then change hundreds at once around big sale periods. That’s why checking on a fixed schedule works better than checking when you remember.",
    },
    {
      q: "Can I track prices on a store that isn’t on Shopify?",
      a: "By hand, yes. The public product list described here is a Shopify feature, and Trailwatch works with Shopify stores only.",
    },
    {
      q: "Should I always match a competitor’s price?",
      a: "No. Price is one reason people choose a product. Match when the product is a close substitute for one of your best sellers and the cut looks lasting. Otherwise hold, and compete on the offer or the product.",
    },
  ],
};
