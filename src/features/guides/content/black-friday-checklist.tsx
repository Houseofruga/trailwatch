import Link from "next/link";
import type { Guide } from "../types";

// G2 (SEO_PLAN.md): search intent "bfcm checklist shopify", "black friday competitor analysis".
// Example brands are fictional.

export const blackFridayChecklist: Guide = {
  slug: "black-friday-competitor-checklist",
  title: "A Black Friday competitor-watching checklist for Shopify brands",
  crumb: "Black Friday checklist",
  summary:
    "What to check about your competitors before, during and after Black Friday week, in the order to do it. Built for a small team with no spare hours.",
  cardSummary: "What to check before, during and after Black Friday week, in order.",
  group: "black-friday",
  date: "2026-10-05",
  readMinutes: 6,
  author: "chandan",
  related: ["track-competitor-black-friday-sales", "real-price-cut-vs-fake-sale"],
  blocks: [
    { type: "h2", id: "how", text: "How to use this checklist" },
    {
      type: "p",
      text: "Most Black Friday checklists are about your own store: the offer, the emails, the ads. This one covers the other half, which is knowing what the stores next to you are doing so your own plan doesn’t get a surprise on the day.",
    },
    {
      type: "p",
      text: "It’s split into three parts. The first takes about two hours and is best done in October. The second is ten minutes a day during the week itself. The third is half an hour in December that makes next year much easier.",
    },
    {
      type: "table",
      caption: "The checklist at a glance.",
      head: [{ label: "When" }, { label: "What to do" }, { label: "Time" }],
      rows: [
        ["October", "Pick competitors, record a baseline, look up last year, decide your responses", "About 2 hours"],
        ["Early November", "Sign up to their emails, watch for early sales", "15 minutes"],
        ["Black Friday week", "Check the five things below, morning and evening", "10 minutes a day"],
        ["First week of December", "Write down what happened", "30 minutes"],
      ],
    },

    { type: "h2", id: "october", text: "October: get ready" },
    { type: "h3", text: "1. Pick three to five competitors" },
    {
      type: "p",
      text: (
        <>
          Choose the stores your customers compare you with, not every store in your category. If you’re unsure who they are, our{" "}
          <Link href="/tools/competitor-finder">free competitor finder</Link> suggests stores that sell products like yours.
        </>
      ),
    },
    { type: "h3", text: "2. Record where each one stands today" },
    {
      type: "p",
      text: (
        <>
          For each store, note the number of products, how many are on sale right now and the price range. This is your baseline. Without it you
          can’t tell a Black Friday price from a discount that runs all year. The{" "}
          <Link href="/tools/store-snapshot">free store snapshot</Link> gives you all three for any Shopify store.
        </>
      ),
    },
    { type: "tool" },
    { type: "h3", text: "3. Look up what they did last year" },
    {
      type: "ul",
      items: [
        <>
          <strong>Search your inbox.</strong> If you were on their email list last November, the dates and offers are all there.
        </>,
        <>
          <strong>Check the Wayback Machine.</strong> It keeps old copies of public web pages. Look at their homepage for the last week of November
          last year.
        </>,
        <>
          <strong>Look at their social posts</strong> from the same week. Brands usually announce the start and the last day.
        </>,
      ],
    },
    {
      type: "p",
      text: "Write down three things for each store: the day the sale started, the headline offer and the day it ended. Most brands repeat roughly what worked.",
    },
    { type: "h3", text: "4. Decide your responses now" },
    {
      type: "p",
      text: "Agree with your team what you’ll do if a competitor goes deeper than you expected, starts a week early or sells out of a best seller. Match, hold, change the offer or move ad budget. Write the answer next to each case.",
    },
    { type: "tip", text: "A response decided in October takes one minute to carry out in November. One decided on the day takes an evening." },

    { type: "h2", id: "early-november", text: "Early November: watch for early starts" },
    {
      type: "ul",
      items: [
        "Sign up to each competitor’s email list with an address you check",
        "Follow them on the one social channel they post on most",
        "Look at their homepage once a week for a banner or a countdown",
        "Check whether an “early access” list or a VIP sale is being promoted",
      ],
    },
    {
      type: "p",
      text: "Many brands now start a week or more before Black Friday. An early start from one competitor is the most common reason a plan needs to change.",
    },

    { type: "h2", id: "week", text: "Black Friday week: five things to check" },
    {
      type: "p",
      text: "Check morning and evening. Sales often start at midnight and get deeper over the weekend.",
    },
    {
      type: "ol",
      items: [
        <>
          <strong>The homepage banner.</strong> What’s the headline offer, and has it changed since yesterday?
        </>,
        <>
          <strong>How much is discounted.</strong> A “sitewide” sale that covers a third of the catalog is a different thing from one that covers
          all of it.
        </>,
        <>
          <strong>The products closest to your best sellers.</strong> Their price today, next to yours.
        </>,
        <>
          <strong>The extras.</strong> Free shipping threshold, free gifts, bundles and the returns window.
        </>,
        <>
          <strong>What’s sold out.</strong> A competitor’s best seller going out of stock sends shoppers looking elsewhere.
        </>,
      ],
    },
    {
      type: "p",
      text: (
        <>
          For a quick look at the second item, the <Link href="/tools/sale-checker">free sale checker</Link> shows whether a store has a sale
          running and how deep it goes. To skip the daily checks, Trailwatch reads each competitor’s catalog every few hours and emails you when a
          sale starts, a product launches or a best seller sells out.
        </>
      ),
    },
    {
      type: "alertFigure",
      store: "Hearth & Pine",
      when: "1h ago",
      title: "Sitewide sale: 61% of products discounted",
      detail: "Discounts from 20% to 40%. Rugs and throws are the deepest. Started overnight.",
      caption: "An example Trailwatch alert. A sale that starts overnight is easy to miss when you check by hand.",
    },

    { type: "h2", id: "after", text: "December: write down what happened" },
    {
      type: "p",
      text: "Do this in the first week of December, while it’s fresh. For each competitor, note:",
    },
    {
      type: "ul",
      items: [
        "The day the sale started and the day it ended",
        "The headline offer and the deepest discount",
        "Whether it got deeper during the week",
        "Which of their products sold out",
        "What you did in response, and whether it worked",
      ],
    },
    {
      type: "p",
      text: "Save it somewhere you’ll find it next October. It replaces step 3 of this checklist next year, and it’s better than anything you can look up after the fact.",
    },
  ],
  faq: [
    {
      q: "When should I start watching competitors for Black Friday?",
      a: "October. You need a baseline of normal prices before any sale starts, and many brands begin discounting a week or more before Black Friday itself.",
    },
    {
      q: "How many competitors should I watch?",
      a: "Three to five. That’s enough to see the pattern in your category and few enough that you’ll actually act on what you see.",
    },
    {
      q: "What if a competitor starts their sale early?",
      a: "Check it against your baseline first. If the discount is on products that compete with your best sellers and it’s deeper than their usual sales, use the response you agreed in October. If not, hold your plan.",
    },
    {
      q: "Does this work for Cyber Monday too?",
      a: "Yes. Treat the whole stretch from the week before Black Friday to the Tuesday after Cyber Monday as one period. Offers often change on the Monday, so keep checking through it.",
    },
  ],
};
