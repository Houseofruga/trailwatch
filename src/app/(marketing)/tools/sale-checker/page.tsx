import type { Metadata } from "next";
import { ToolLanding } from "../ToolParts";
import { ToolIcons } from "../toolIcons";
import { SaleChecker } from "./SaleChecker";

// Free tool T3 (SEO_PLAN.md): is a store running a sale, and how deep is it?

const DESCRIPTION =
  "Free sale checker: find out if any Shopify store is running a sale right now, how much of its catalog is discounted and how deep the discounts go.";

export const metadata: Metadata = {
  title: { absolute: "Is this store having a sale? Free sale checker — Trailwatch" },
  description: DESCRIPTION,
  alternates: { canonical: "/tools/sale-checker" },
  openGraph: { title: "Is this store having a sale?", description: DESCRIPTION, url: "/tools/sale-checker" },
};

export default function SaleCheckerPage() {
  return (
    <ToolLanding
      slug="sale-checker"
      h1="Is this store having a sale?"
      lead="Enter a store to see if it’s running a sale right now, how much of its catalog is discounted, and how deep it goes."
      description={DESCRIPTION}
      how={{
        title: "How we check",
        lead: "We read the store’s public catalog and compare each price with its listed original price.",
        items: [
          {
            icon: ToolIcons.doc,
            title: "We read every price",
            body: "Most Shopify stores list each product’s price and its “compare at” (original) price at /products.json.",
          },
          {
            icon: ToolIcons.tag,
            title: "We spot the discounts",
            body: "A product is on sale when its price is below its compare-at price and it’s in stock.",
          },
          {
            icon: ToolIcons.chart,
            title: "We size up the sale",
            body: "If a large share of what’s in stock is discounted at once, we call it a sitewide sale.",
          },
        ],
      }}
      faq={[
        {
          q: "What counts as a sitewide sale?",
          a: "When at least 30% of a store’s in-stock products, and at least five of them, are discounted at the same time. Smaller sets of discounts show as “some products on sale”.",
        },
        {
          q: "Does it catch discount codes?",
          a: "Not on their own: a code applied at checkout doesn’t change the prices in the catalog. When a store marks prices down on the products themselves, we see it.",
        },
        {
          q: "Which stores does this work with?",
          a: "Shopify stores that keep their catalog public, which most do. If a store has switched it off, or isn’t on Shopify, we’ll say so.",
        },
        {
          q: "Can I get told when a sale starts?",
          a: "Yes, with Trailwatch: it checks your competitors’ stores every couple of hours and sends an alert as soon as a sitewide sale starts. It’s free during the beta.",
        },
      ]}
    >
      <SaleChecker />
    </ToolLanding>
  );
}
