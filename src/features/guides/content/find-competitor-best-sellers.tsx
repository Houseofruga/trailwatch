import Link from "next/link";
import type { Guide } from "../types";

// G6 (SEO_PLAN.md): search intent "find competitor best sellers shopify".
// Example brands are fictional.

export const findCompetitorBestSellers: Guide = {
  slug: "find-competitor-best-sellers",
  title: "How to find a competitor’s best sellers on Shopify",
  crumb: "Finding best sellers",
  summary:
    "Five public signs that show which of a competitor’s products sell best, how far to trust each one, and what to do once you know.",
  cardSummary: "Five public signs of what sells best on a competitor’s store.",
  group: "evergreen",
  date: "2026-10-05",
  readMinutes: 5,
  author: "chandan",
  related: ["competitor-out-of-stock", "see-competitor-new-products"],
  blocks: [
    { type: "h2", id: "limits", text: "What you can and can’t know" },
    {
      type: "p",
      text: "A competitor’s sales figures are private, and no public tool can show them. Be wary of anything that claims to. What you can see is the order a store ranks its own products in, and a handful of signs that point the same way. Put together, they give a reliable picture of the top few products.",
    },

    { type: "h2", id: "signs", text: "Five signs to look at" },
    { type: "h3", text: "1. The best sellers page" },
    {
      type: "p",
      text: "Many stores have a best sellers collection in the main menu. Its address is usually:",
    },
    { type: "code", text: "hearthandpine.com/collections/best-sellers" },
    {
      type: "p",
      text: "The store picks what goes here, so it shows what they want to sell as much as what sells. It’s still the best starting point.",
    },
    { type: "h3", text: "2. The catalog sorted by best selling" },
    {
      type: "p",
      text: "Most Shopify stores list every product on one page, and Shopify can sort that page by sales. Add this ending to the store’s address:",
    },
    { type: "code", text: "hearthandpine.com/collections/all?sort_by=best-selling" },
    {
      type: "p",
      text: "This order comes from the store’s real sales, not from what the store chooses to feature. It’s a ranking, not a number, and it doesn’t say what period it covers. Some store designs ignore the sort option.",
    },
    { type: "h3", text: "3. Review counts" },
    {
      type: "p",
      text: "A product with 2,000 reviews has sold far more than one with 40. Review counts favor older products, so use them to confirm the top of the list, not to rank new launches.",
    },
    { type: "h3", text: "4. What they advertise and feature" },
    {
      type: "p",
      text: "Brands spend money on what converts. Look at the first products on the homepage, and at the brand’s active ads in Meta’s Ad Library, which is public. A product that appears in many ads for months is almost certainly a top seller.",
    },
    { type: "h3", text: "5. What sells out and comes back" },
    {
      type: "p",
      text: (
        <>
          A product that sells out, gets restocked and sells out again is in demand. Our guide to{" "}
          <Link href="/guides/competitor-out-of-stock">spotting when a competitor is out of stock</Link> covers how to see this.
        </>
      ),
    },
    {
      type: "table",
      caption: "How far to trust each sign.",
      head: [{ label: "Sign" }, { label: "What it shows" }, { label: "Watch out for" }],
      rows: [
        ["Best sellers page", "What the store calls its best sellers", "Chosen by the store"],
        ["Sorted by best selling", "The store’s own sales ranking", "No numbers, unknown period"],
        ["Review counts", "Sales over a product’s whole life", "Favors older products"],
        ["Ads and homepage", "What the brand is betting on", "New launches get pushed too"],
        ["Sell-outs and restocks", "Demand right now", "Can also mean a supply problem"],
      ],
    },
    { type: "tip", text: "When three of the five agree on a product, treat it as a best seller." },

    { type: "h2", id: "catalog", text: "See the catalog behind the ranking" },
    {
      type: "p",
      text: "A ranking means more when you know the size and price range of the catalog it sits in. The free store snapshot gives you that for any Shopify store:",
    },
    { type: "tool" },

    { type: "h2", id: "use", text: "What to do with the list" },
    {
      type: "ul",
      items: [
        <>
          <strong>Match each one to your own catalog.</strong> For each of their top five, which of your products would a shopper compare it
          with?
        </>,
        <>
          <strong>Compare prices on those pairs.</strong> These are the prices that matter most.
        </>,
        <>
          <strong>Look for gaps.</strong> A best seller of theirs with no match in your catalog is a product idea worth a look.
        </>,
        <>
          <strong>Watch those products closely.</strong> A sale, a price change or a sell-out on a best seller matters more than the same change
          anywhere else in their catalog.
        </>,
      ],
    },

    { type: "h2", id: "ongoing", text: "Keep the list current" },
    {
      type: "p",
      text: "Best sellers change with the season and with each launch. Trailwatch reads a competitor’s best sellers page along with their catalog, shows the list in your report, and alerts you when one of those top products sells out.",
    },
    {
      type: "alertFigure",
      store: "Hearth & Pine",
      when: "2h ago",
      title: "Best seller sold out: Wool throw blanket",
      detail: "All 4 colors are out of stock. It’s listed third on their best sellers page.",
      caption: "An example Trailwatch alert. A sold-out best seller is a chance to reach their shoppers.",
    },
  ],
  faq: [
    {
      q: "Can I see how many units a competitor sold?",
      a: "No. Sales figures are private. You can see the order a store ranks its products in and other public signs, which is enough to know the top few products with confidence.",
    },
    {
      q: "How accurate is Shopify’s best-selling sort?",
      a: "It reflects the store’s real sales, so the order is trustworthy. It doesn’t give numbers or say what period it covers, so use it as a ranking only.",
    },
    {
      q: "What if a store has no best sellers page?",
      a: "Try the catalog sorted by best selling, then check review counts and what the brand advertises. Two or three signs agreeing is enough.",
    },
    {
      q: "How often do best sellers change?",
      a: "The top one or two tend to hold for a long time. The rest shift with seasons, launches and sales, so it’s worth checking again every month or so.",
    },
  ],
};
