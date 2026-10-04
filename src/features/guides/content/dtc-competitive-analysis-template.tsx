import Link from "next/link";
import type { Guide } from "../types";

// G9 (SEO_PLAN.md): search intent "dtc competitive analysis template".
// Example brands are fictional; the filled-in table is marked as an illustration.

export const dtcCompetitiveAnalysisTemplate: Guide = {
  slug: "dtc-competitive-analysis-template",
  title: "Competitive analysis for DTC brands: a practical template",
  crumb: "Competitive analysis template",
  summary:
    "A one-page competitive analysis you can fill in for each competitor in under an hour, with what to record, where to find it and how to keep it current.",
  cardSummary: "A one-page analysis to fill in for each competitor in under an hour.",
  group: "evergreen",
  date: "2026-10-05",
  readMinutes: 7,
  author: "chandan",
  related: ["find-shopify-store-competitors", "find-competitor-best-sellers"],
  blocks: [
    { type: "h2", id: "why", text: "Why most competitive analyses go unused" },
    {
      type: "p",
      text: "The usual competitive analysis is a long document made once, presented once and never opened again. By the time anyone needs it, the prices in it are wrong.",
    },
    {
      type: "p",
      text: "This template is built to avoid that. It’s one page per competitor, it only records things you’d act on, and it separates what rarely changes from what changes every week.",
    },

    { type: "h2", id: "before", text: "Before you start" },
    {
      type: "p",
      text: (
        <>
          Pick three to five competitors. If you haven’t settled on them, our guide to{" "}
          <Link href="/guides/find-shopify-store-competitors">finding your real competitors</Link> covers how. Then set aside about 45 minutes per
          store. Everything below comes from public pages.
        </>
      ),
    },

    { type: "h2", id: "template", text: "The template" },
    {
      type: "p",
      text: "Six sections. Copy the left column into a document or spreadsheet and fill in one for each competitor.",
    },
    {
      type: "table",
      caption: "The one-page template, with where to find each answer.",
      head: [{ label: "Section" }, { label: "What to record" }, { label: "Where to find it" }],
      rows: [
        ["1. Who they sell to", "Their one-line promise and the customer in their photos", "Homepage, About page"],
        ["2. Catalog", "Number of products, main categories, price range", "Store snapshot, main menu"],
        ["3. Top products", "Their five best sellers and your closest match to each", "Best sellers page, review counts"],
        ["4. Pricing and offers", "Prices on the matched products, share of catalog on sale, usual discount", "Product pages, sale page"],
        ["5. Buying terms", "Free shipping threshold, returns window, subscriptions, bundles", "Shipping and returns pages"],
        ["6. How they reach people", "Email frequency, main social channel, what their ads feature", "Their emails, Meta’s Ad Library"],
      ],
    },
    {
      type: "p",
      text: "For section 2, the free store snapshot gives you the product count, the price range and how much of the catalog is on sale for any Shopify store:",
    },
    { type: "tool" },
    {
      type: "p",
      text: (
        <>
          For section 3, see our guide to <Link href="/guides/find-competitor-best-sellers">finding a competitor’s best sellers</Link>.
        </>
      ),
    },

    { type: "h2", id: "example", text: "A filled-in example" },
    {
      type: "table",
      caption: "An example for one competitor. The brand and every figure are made up for illustration.",
      head: [{ label: "Section" }, { label: "Dewlane" }],
      rows: [
        ["Who they sell to", "“Hotel bedding for real homes.” First-time homeowners, neutral styling"],
        ["Catalog", "313 products. Bedding, bath, sleepwear. $14 to $389"],
        ["Top products", "Linen duvet cover, percale sheet set, waffle towels. We match the first two"],
        ["Pricing and offers", "Duvet cover $180 against our $195. About a quarter of the catalog on sale most weeks"],
        ["Buying terms", "Free shipping over $75. 100-night returns. No subscription"],
        ["How they reach people", "Three emails a week. Mostly Instagram. Ads feature the sheet set"],
      ],
    },

    { type: "h2", id: "so-what", text: "The step most people skip: so what?" },
    {
      type: "p",
      text: "A filled-in page is only a description. Under each one, write three short lines:",
    },
    {
      type: "ol",
      items: [
        <>
          <strong>Where they beat us.</strong> In the example: a lower price on the duvet cover and a longer returns window.
        </>,
        <>
          <strong>Where we beat them.</strong> Something a shopper would notice, not something only you care about.
        </>,
        <>
          <strong>One thing we’ll do about it.</strong> A single action with a name and a date next to it.
        </>,
      ],
    },
    {
      type: "tip",
      text: "If you can’t think of an action, the analysis isn’t finished. Go back to the matched products and compare them the way a shopper would.",
    },

    { type: "h2", id: "current", text: "Keeping it current" },
    {
      type: "p",
      text: "The six sections change at very different speeds, and that’s what decides how often to revisit them.",
    },
    {
      type: "table",
      caption: "How often each section needs another look.",
      head: [{ label: "Section" }, { label: "Changes" }, { label: "Check" }],
      rows: [
        ["Who they sell to", "Rarely", "Twice a year"],
        ["Buying terms", "A few times a year", "Every quarter"],
        ["How they reach people", "With each campaign", "Every month"],
        ["Catalog, top products, pricing and offers", "Every week", "Every week, or automatically"],
      ],
    },
    {
      type: "p",
      text: "The first three are fine to do by hand. The last row is where a manual analysis goes stale, because it means opening every competitor’s store every week.",
    },
    {
      type: "p",
      text: "That’s the part Trailwatch handles. It reads each competitor’s catalog every few hours, alerts you to launches, sales and sold-out best sellers, and sends a Monday briefing that sets their week against your own products.",
    },
    {
      type: "alertFigure",
      store: "Dewlane",
      when: "5h ago",
      title: "New product: Linen quilt, $210",
      detail: "Their first quilt. It sits in Bedding, between their duvet cover and their comforter.",
      caption: "An example Trailwatch alert. The catalog rows of your analysis stay current without a weekly check.",
    },
  ],
  faq: [
    {
      q: "How long does a competitive analysis take?",
      a: "With this template, about 45 minutes per competitor the first time. After that, the slow-changing sections need a few minutes a quarter.",
    },
    {
      q: "How often should I update it?",
      a: "Positioning twice a year, buying terms each quarter, marketing each month. Catalog, prices and offers change weekly, so either check them weekly or use a tool that tracks them for you.",
    },
    {
      q: "Do I need paid tools to do this?",
      a: "No. Everything in the template comes from public pages, and our free tools cover the catalog section for Shopify stores. A paid tool saves the weekly checking, not the first analysis.",
    },
    {
      q: "Should I include a SWOT analysis?",
      a: "Only if it leads to a decision. The three lines under each page, where they beat you, where you beat them and one action, do the same job in less space.",
    },
  ],
};
