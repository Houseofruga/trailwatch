import Link from "next/link";
import type { Guide } from "../types";

// G7 (SEO_PLAN.md): search intent "competitor out of stock".
// Example brands are fictional; the table's entries are marked as an illustration.

export const competitorOutOfStock: Guide = {
  slug: "competitor-out-of-stock",
  title: "How to tell when a competitor is out of stock",
  crumb: "Spotting sell-outs",
  summary:
    "How to see when a competitor’s product sells out or runs low, what it tells you about demand, and how to use the opening while it lasts.",
  cardSummary: "How to see a competitor’s sell-outs, and how to use the opening.",
  group: "evergreen",
  date: "2026-10-05",
  readMinutes: 5,
  author: "chandan",
  related: ["find-competitor-best-sellers", "track-competitor-prices-shopify"],
  blocks: [
    { type: "h2", id: "why", text: "Why a competitor’s stock matters" },
    {
      type: "p",
      text: "When a shopper wants a product today and finds it sold out, they look for the nearest alternative. If that’s your product, the days a competitor is out of stock are some of the easiest sales you’ll get. They’re also a clear sign of which of their products are really in demand.",
    },

    { type: "h2", id: "see", text: "What you can see from outside" },
    {
      type: "p",
      text: "It helps to be clear about the limits. On most Shopify stores you can see whether each size or color of a product is available to buy. You usually can’t see how many units are left.",
    },
    { type: "h3", text: "On the product page" },
    {
      type: "ul",
      items: [
        "A “Sold out” button in place of “Add to cart”",
        "Sizes or colors that are greyed out or crossed through",
        "A “Notify me when it’s back” sign-up",
        "A “Pre-order” button or a note with a shipping date weeks away",
      ],
    },
    { type: "h3", text: "In the public product list" },
    {
      type: "p",
      text: "Many Shopify stores publish their product list at a public address. For every size and color, it says whether that option is available. This is the quickest way to see stock across a whole catalog instead of one page at a time:",
    },
    { type: "code", text: "northwindknits.com/products.json" },
    {
      type: "p",
      text: (
        <>
          Not every store leaves this list open. The <Link href="/tools/shopify-store-checker">free Shopify store checker</Link> tells you whether
          a store’s list is public.
        </>
      ),
    },

    { type: "h2", id: "low", text: "Signs a product is running low" },
    {
      type: "ul",
      items: [
        <>
          <strong>Options going one by one.</strong> The popular sizes sell out first. When medium and large are gone, the rest usually follow.
        </>,
        <>
          <strong>“Only a few left” messages.</strong> Some stores show these. Treat them with care, since they’re sometimes switched on
          permanently to create urgency.
        </>,
        <>
          <strong>Delivery dates slipping.</strong> A longer shipping time on one product often means stock is on its way, not on the shelf.
        </>,
        <>
          <strong>The product leaves their ads.</strong> Brands stop advertising what they can’t deliver.
        </>,
      ],
    },

    { type: "h2", id: "meaning", text: "What a sell-out tells you" },
    {
      type: "table",
      caption: "Reading a sell-out. These are examples of patterns, not data from a real store.",
      head: [{ label: "What you see" }, { label: "What it probably means" }],
      rows: [
        ["A best seller sells out, returns within weeks, sells out again", "Strong demand they’re struggling to keep up with"],
        ["A new product sells out in its first week", "A good launch, or a small first batch"],
        ["A product sells out and never returns", "Discontinued"],
        ["Many products sell out at once", "A supply problem, or the end of a big sale"],
        ["Sold out, then back at a higher price", "They’re testing how much demand will bear"],
      ],
    },

    { type: "h2", id: "act", text: "How to use the opening" },
    {
      type: "p",
      text: "A sell-out can end any day, so the useful responses are the ones you can do quickly:",
    },
    {
      type: "ol",
      items: [
        <>
          <strong>Check your own stock first.</strong> There’s no point sending shoppers to a product you’re also low on.
        </>,
        <>
          <strong>Move ad budget to your matching product</strong> for as long as theirs is unavailable.
        </>,
        <>
          <strong>Feature it</strong> on your homepage and in this week’s email.
        </>,
        <>
          <strong>Hold your price.</strong> With the main alternative unavailable, there’s no reason to discount.
        </>,
      ],
    },
    {
      type: "tip",
      text: "Keep it about your product. Ads that name a competitor or mention their stock problems tend to backfire.",
    },

    { type: "h2", id: "alerts", text: "Know the day it happens" },
    {
      type: "p",
      text: "The opening is only useful if you hear about it in time. Trailwatch reads each competitor’s catalog every few hours. When one of their best sellers sells out, you get an alert. Other sell-outs and restocks are collected in your Monday briefing.",
    },
    {
      type: "alertFigure",
      store: "Northwind Knits",
      when: "3h ago",
      title: "Best seller sold out: Merino crew sweater",
      detail: "All 6 sizes are unavailable. It was in stock at yesterday’s check.",
      caption: "An example Trailwatch alert for a sell-out on one of a competitor’s top products.",
    },
    {
      type: "p",
      text: (
        <>
          To know which products count as their best sellers in the first place, see our guide to{" "}
          <Link href="/guides/find-competitor-best-sellers">finding a competitor’s best sellers</Link>.
        </>
      ),
    },
  ],
  faq: [
    {
      q: "Can I see exactly how many units a competitor has left?",
      a: "Usually not. Most stores only show whether a product can be bought. Trailwatch reports what’s public: which products and options are available and which are sold out.",
    },
    {
      q: "How long do sell-outs usually last?",
      a: "It depends on the product and the brand’s supply. Some are back within days, others take months. That’s why it helps to hear about a sell-out the day it happens and again when the product returns.",
    },
    {
      q: "Is an “only 2 left” message reliable?",
      a: "Sometimes. Some stores show real stock levels, and others show a low-stock message all the time to create urgency. If the message never changes, don’t rely on it.",
    },
    {
      q: "Does this work for stores that aren’t on Shopify?",
      a: "You can check any store’s product pages by hand. The public product list and Trailwatch’s tracking work with Shopify stores.",
    },
  ],
};
