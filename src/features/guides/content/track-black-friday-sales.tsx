import Link from "next/link";
import type { Guide } from "../types";

// G1 (SEO_PLAN.md): search intent "competitor black friday sale".
// Example brands are fictional; the table's numbers are marked as an illustration.

export const trackBlackFridaySales: Guide = {
  slug: "track-competitor-black-friday-sales",
  title: "How to track competitor Black Friday sales without checking every site",
  crumb: "Tracking Black Friday sales",
  summary:
    "A simple routine for knowing when a competitor’s sale starts, how deep it goes and when it ends, without opening their site every morning.",
  cardSummary: "A routine for knowing when a sale starts, how deep it goes and when it ends.",
  group: "black-friday",
  date: "2026-10-05",
  readMinutes: 7,
  author: "chandan",
  related: ["black-friday-competitor-checklist", "real-price-cut-vs-fake-sale"],
  blocks: [
    { type: "h2", id: "why", text: "Why Black Friday is different" },
    {
      type: "p",
      text: "For most of the year a competitor changes a handful of prices a week. Around Black Friday the same store can discount half its catalog overnight, deepen the sale two days later and end it without warning. If you check their site by hand each morning, you find out after your customers do.",
    },
    {
      type: "p",
      text: "Checking more often doesn’t fix that. What works is deciding in advance what you’re watching for, writing down where each competitor stands today, and letting something else do the checking.",
    },

    { type: "h2", id: "list", text: "Make a short list of competitors" },
    {
      type: "p",
      text: "Pick the three to five stores your customers actually compare you with. If you’re not sure who they are, here are three quick ways to find out:",
    },
    {
      type: "ol",
      items: [
        <>
          <strong>Search like a customer.</strong> Type your main product into Google and note which stores appear next to yours.
        </>,
        <>
          <strong>Ask recent buyers.</strong> Add one question to your order confirmation email: “Where else did you look?”
        </>,
        <>
          <strong>See who advertises on your name.</strong> Search for your own brand. The stores running ads there are already watching you.
        </>,
      ],
    },
    { type: "tip", text: "Fewer is better. Five stores you act on beat twenty you skim." },
    {
      type: "p",
      text: (
        <>
          If you sell on Shopify, our <Link href="/tools/competitor-finder">free competitor finder</Link> suggests stores that sell products like yours.
        </>
      ),
    },

    { type: "h2", id: "shopify", text: "Check which ones run on Shopify" },
    {
      type: "p",
      text: "Many Shopify stores publish their product list at a public address. When a competitor does, you can read every product, its price and whether it’s in stock, without guessing from the storefront. Add this ending to their address:",
    },
    { type: "code", text: "dewlane.com/products.json" },
    {
      type: "p",
      text: (
        <>
          If you see a page of product data, the store is on Shopify and its list is public. If you get an error, the store may run on another
          platform, or it may have hidden the list. Our <Link href="/tools/shopify-store-checker">free Shopify store checker</Link> tells you which, in
          a few seconds.
        </>
      ),
    },
    { type: "tool" },

    { type: "h2", id: "baseline", text: "Write down where each store stands today" },
    {
      type: "p",
      text: "Do this now, in October. A baseline is how you tell a real Black Friday price from a “sale” that runs all year. For each store, note how big the catalog is, how much of it is already discounted and the price range.",
    },
    {
      type: "table",
      caption: "An example baseline. The brands and numbers are made up for illustration.",
      head: [{ label: "Store" }, { label: "Products", numeric: true }, { label: "On sale today", numeric: true }, { label: "Price range" }],
      rows: [
        ["Dewlane", "313", "78", "$14 to $389"],
        ["Hearth & Pine", "1,632", "199", "$9 to $640"],
        ["Northwind Knits", "204", "0", "$38 to $210"],
      ],
    },
    { type: "h3", text: "What else to note for each store" },
    {
      type: "ul",
      items: [
        "Their best sellers, if the store shows a best sellers page",
        "The products closest to your own top products, and their prices",
        "Their free shipping threshold and returns window",
      ],
    },
    {
      type: "p",
      text: "In the example, Dewlane already has a quarter of its catalog on sale on a normal day. If that figure is the same in late November, it isn’t running a Black Friday sale at all. Northwind Knits has nothing discounted, so any sale there is news.",
    },

    { type: "h2", id: "moves", text: "Decide what counts as a move" },
    {
      type: "p",
      text: "Not every change needs an answer. Agree with your team before November which changes do. For most brands it’s these three:",
    },
    {
      type: "ul",
      items: [
        <>
          <strong>A sale starts or gets deeper</strong> on products that compete with your best sellers
        </>,
        <>
          <strong>A new product launches</strong> in a category you sell in
        </>,
        <>
          <strong>A best seller sells out</strong>, which can send their customers your way
        </>,
      ],
    },
    {
      type: "p",
      text: "For each one, decide now what you’d do: match the price, hold it, change the offer, or move ad budget. A decision made calmly in October is better than one made at midnight on Black Friday.",
    },

    { type: "h2", id: "alerts", text: "Get told instead of checking" },
    {
      type: "p",
      text: (
        <>
          Once you know what you’re watching for, the checking itself is the part to hand off. You can do a spot check on any store with our{" "}
          <Link href="/tools/sale-checker">free sale checker</Link>, which shows whether a sale is running right now and how deep it goes.
        </>
      ),
    },
    {
      type: "p",
      text: "For the whole season, set up alerts. Trailwatch reads each competitor’s catalog every few hours and emails you when one of those moves happens, with how much of the catalog is discounted, how deep the discounts go and when it started.",
    },
    {
      type: "alertFigure",
      store: "Dewlane",
      when: "2h ago",
      title: "Sitewide sale: 34% of products discounted",
      detail: "Discounts from 15% to 40%. Bedding is the deepest. Started this morning.",
      caption: "An example Trailwatch alert for a competitor’s sale. You see the depth and the timing without opening their site.",
    },
  ],
  faq: [
    {
      q: "Is it fair to watch a competitor’s prices?",
      a: "Yes. Trailwatch reads only what any shopper can see: public product pages and catalogs. It doesn’t log in, buy anything or get around a store that blocks automated visits.",
    },
    {
      q: "How often should I check during Black Friday week?",
      a: "Sales can start at midnight and change within a day, so once a day is too slow that week. Either check your short list morning and evening, or use alerts so a change reaches you within hours.",
    },
    {
      q: "What if a competitor isn’t on Shopify?",
      a: "You can still watch their homepage and sale page by hand, and sign up to their emails. You won’t get a full product list the way you do with a Shopify store, so focus on their headline offer and their best sellers.",
    },
    {
      q: "Do I need to match every discount?",
      a: "No. A discount matters when it’s on products your customers compare with yours, and when it’s deeper than that store’s normal sales. Your October baseline tells you both.",
    },
  ],
};
