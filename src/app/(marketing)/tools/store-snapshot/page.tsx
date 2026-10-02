import type { Metadata } from "next";
import { ToolLanding } from "../ToolParts";
import { ToolIcons } from "../toolIcons";
import { StoreSnapshot } from "./StoreSnapshot";

// Free tool T2 (SEO_PLAN.md): one read of a store's public catalog, summarised.

const DESCRIPTION =
  "Free Shopify store analyzer: see how many products a store sells, its price range, what's on sale, what's sold out and what's new. No sign-up.";

export const metadata: Metadata = {
  title: { absolute: "Shopify store analyzer: see what any store sells — TrailWatch" },
  description: DESCRIPTION,
  alternates: { canonical: "/tools/store-snapshot" },
  openGraph: { title: "See what any Shopify store sells", description: DESCRIPTION, url: "/tools/store-snapshot" },
};

export default function StoreSnapshotPage() {
  return (
    <ToolLanding
      slug="store-snapshot"
      h1="See what any Shopify store sells"
      lead="Enter a store to see its product count, price range, what’s on sale, what’s sold out and what’s new this month."
      description={DESCRIPTION}
      how={{
        title: "How it works",
        lead: "Everything comes from the store’s own public catalog, read the moment you ask.",
        items: [
          {
            icon: ToolIcons.doc,
            title: "We read its public catalog",
            body: "Most Shopify stores list every product, price and stock level at /products.json, an address any visitor can open.",
          },
          {
            icon: ToolIcons.chart,
            title: "We count and compare",
            body: "Products, the cheapest and dearest prices, what’s discounted and what’s sold out, with add-ons like shipping protection left out.",
          },
          {
            icon: ToolIcons.tag,
            title: "We show what’s new",
            body: "Products the store added in the last 30 days, newest first, and its deepest discounts right now.",
          },
        ],
      }}
      faq={[
        {
          q: "Which stores does this work with?",
          a: "Shopify stores that keep their catalog public, which most do. If a store has switched it off, or isn’t on Shopify, we’ll say so. You can check with the Shopify store checker.",
        },
        {
          q: "Why does it say “1,000+” products?",
          a: "To keep each check quick and polite to the store, we read the first 1,000 products. Big stores have more; the numbers then describe those first 1,000.",
        },
        {
          q: "How fresh is the data?",
          a: "It’s read from the store when you ask. If someone looked up the same store in the last day, you’ll see that result, so we don’t fetch the same store over and over.",
        },
        {
          q: "Can I track changes over time?",
          a: "Not here: this is a one-off snapshot. TrailWatch checks a store every couple of hours and tells you when it launches products, changes prices, starts a sale or sells out. It’s free during the beta.",
        },
      ]}
    >
      <StoreSnapshot />
    </ToolLanding>
  );
}
