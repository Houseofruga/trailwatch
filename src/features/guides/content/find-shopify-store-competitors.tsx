import Link from "next/link";
import type { Guide } from "../types";

// G8 (SEO_PLAN.md): search intent "find ecommerce competitors" (pairs with the competitor finder).
// Example brands are fictional.

export const findShopifyStoreCompetitors: Guide = {
  slug: "find-shopify-store-competitors",
  title: "How to find your Shopify store’s real competitors",
  crumb: "Finding your competitors",
  summary:
    "Your real competitors are the stores your customers compare you with, which isn’t always who you’d guess. Five ways to find them and how to narrow the list.",
  cardSummary: "Five ways to find the stores your customers actually compare you with.",
  group: "evergreen",
  date: "2026-10-05",
  readMinutes: 6,
  author: "chandan",
  related: ["dtc-competitive-analysis-template", "track-competitor-prices-shopify"],
  blocks: [
    { type: "h2", id: "real", text: "What makes a competitor “real”" },
    {
      type: "p",
      text: "Ask most founders who their competitors are and you’ll hear the two or three brands they admire or resent. Those aren’t always the stores taking their sales. A real competitor is one a shopper seriously considers at the moment they’re choosing your product.",
    },
    {
      type: "p",
      text: "That usually means three things are true: they sell a similar product, at a price in the same range, to the same kind of customer. A brand with the same product at three times your price is rarely competing with you.",
    },

    { type: "h2", id: "ways", text: "Five ways to find them" },
    { type: "h3", text: "1. Search like a customer" },
    {
      type: "p",
      text: "Type what a shopper would type, not your brand name. “Linen duvet cover queen”, not “Dewlane”. Note the stores in the shopping results and the first page. Do it for your three best-selling products. Use a private window so your own history doesn’t shape the results.",
    },
    { type: "h3", text: "2. Ask your customers" },
    {
      type: "p",
      text: "Add one question to your post-purchase survey or order confirmation email: “Which other brands did you consider?” Twenty answers will tell you more than an afternoon of research, and they often include a name you hadn’t thought of.",
    },
    { type: "h3", text: "3. See who advertises on your name" },
    {
      type: "p",
      text: "Search for your own brand name. Stores running ads above your result are deliberately going after your shoppers. They’ve already decided you’re a competitor.",
    },
    { type: "h3", text: "4. Read where shoppers compare" },
    {
      type: "p",
      text: "Search for your product type with “best” or “vs” in front, and look at roundup articles, Reddit threads and review videos. The brands that keep appearing next to yours, or in lists you’re missing from, belong on your list.",
    },
    { type: "h3", text: "5. Use a tool" },
    {
      type: "p",
      text: (
        <>
          Our <Link href="/tools/competitor-finder">free competitor finder</Link> takes your store’s address and suggests stores that sell
          products like yours. It’s a quick way to get a first list, or to check the one you’ve made by hand.
        </>
      ),
    },

    { type: "h2", id: "narrow", text: "Narrow the list to three to five" },
    {
      type: "p",
      text: "You’ll likely end up with ten or more names. Score each one on four questions and keep the stores that get a yes on at least three:",
    },
    {
      type: "table",
      caption: "Four questions for each store on your list.",
      head: [{ label: "Question" }, { label: "How to check" }],
      rows: [
        ["Do they sell a product a shopper would swap for yours?", "Compare their top products with your top products"],
        ["Is their price within about 30% of yours?", "Compare the matching products, not the whole catalog"],
        ["Are they selling to the same customer?", "Look at their homepage, photos and wording"],
        ["Did they come up more than once?", "Count how many of the five methods found them"],
      ],
    },
    {
      type: "p",
      text: "To compare catalogs quickly, the free store snapshot shows any Shopify store’s product count, price range and how much is on sale:",
    },
    { type: "tool" },
    {
      type: "tip",
      text: "Keep one “aspirational” brand if you like, the bigger one you want to become. Watch it for ideas, not for prices.",
    },

    { type: "h2", id: "skip", text: "Who to leave off" },
    {
      type: "ul",
      items: [
        <>
          <strong>Marketplaces.</strong> Amazon and similar sites compete with everyone. You can’t learn much from tracking them as a single
          competitor.
        </>,
        <>
          <strong>Brands far above or below your price.</strong> Their shoppers aren’t choosing between you.
        </>,
        <>
          <strong>Stores that only overlap on one minor product.</strong> Unless that product is one of your best sellers.
        </>,
        <>
          <strong>Brands you just don’t like.</strong> It’s a list of who your customers consider, not who annoys you.
        </>,
      ],
    },

    { type: "h2", id: "next", text: "What to do with the list" },
    {
      type: "p",
      text: (
        <>
          Once you have three to five names, record where each one stands today, then decide what you’ll watch for. Our{" "}
          <Link href="/guides/dtc-competitive-analysis-template">competitive analysis template</Link> walks through it.
        </>
      ),
    },
    {
      type: "p",
      text: "If they’re on Shopify, you can add them to Trailwatch and have their launches, sales and sell-outs sent to you, with a Monday briefing that puts their week next to your own products.",
    },
    {
      type: "p",
      text: "Review the list every six months. New brands appear, and your own catalog changes who you’re up against.",
    },
  ],
  faq: [
    {
      q: "How many competitors should I track?",
      a: "Three to five. With fewer you miss what’s happening in your category. With more you stop reading what comes in.",
    },
    {
      q: "What if I can’t find any direct competitors?",
      a: "Look at what your customers were doing before they found you. That alternative, even if it’s a different kind of product, is your competition. Asking recent buyers is the fastest way to find it.",
    },
    {
      q: "How do I know if a competitor is on Shopify?",
      a: "Use our free Shopify store checker. Enter the store’s address and it tells you whether the site runs on Shopify and how it can tell.",
    },
    {
      q: "Are big brands my competitors?",
      a: "Only if your shoppers really choose between you and them. If their price and customer are different from yours, watch them for ideas but leave them off your main list.",
    },
  ],
};
