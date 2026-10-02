import type { Metadata } from "next";
import { CompetitorFinder } from "../../CompetitorFinder";
import { ToolLanding } from "../ToolParts";
import { ToolIcons } from "../toolIcons";
import styles from "../tools.module.css";

// Free tool T4 (SEO_PLAN.md): the homepage competitor finder on its own page.
// Picks carry into onboarding the same way (tw_pending_competitors).

const DESCRIPTION =
  "Free competitor finder for Shopify brands: enter your store and get a list of the stores you compete with. No sign-up.";

export const metadata: Metadata = {
  title: { absolute: "Find your Shopify store’s competitors — free competitor finder — TrailWatch" },
  description: DESCRIPTION,
  alternates: { canonical: "/tools/competitor-finder" },
  openGraph: { title: "Find your store’s competitors", description: DESCRIPTION, url: "/tools/competitor-finder" },
};

export default function CompetitorFinderPage() {
  return (
    <ToolLanding
      slug="competitor-finder"
      h1="Find your store’s competitors"
      lead="Enter your store and get a list of the brands selling products like yours. Edit it, then track them free."
      description={DESCRIPTION}
      how={{
        title: "How it works",
        lead: "A starting list you can edit, not a final answer.",
        items: [
          {
            icon: ToolIcons.globe,
            title: "We read your store",
            body: "Your homepage tells us what you sell and who you sell to.",
          },
          {
            icon: ToolIcons.search,
            title: "We suggest likely competitors",
            body: "An AI model suggests brands selling similar products to a similar customer, with their own websites.",
          },
          {
            icon: ToolIcons.bag,
            title: "You choose who to track",
            body: "Remove any that don’t fit and add ones we missed. Marketplaces like Amazon are left out.",
          },
        ],
      }}
      faq={[
        {
          q: "How accurate are the suggestions?",
          a: "They’re a starting point. The model knows many brands but can miss new or very small ones, so check the list and edit it before you track anyone.",
        },
        {
          q: "Why do I need to enter my own store?",
          a: "It’s the best clue to who you compete with: what you sell, at what price, to whom. We don’t save it unless you sign up.",
        },
        {
          q: "What happens after I pick competitors?",
          a: "Join the beta and they’re added to your account, ready to track. TrailWatch then tells you when they launch products, change prices, start a sale or sell out.",
        },
        {
          q: "Is this free?",
          a: "Yes. There’s no sign-up to see the list. If you run lots of searches in a minute, we’ll ask you to wait a moment.",
        },
      ]}
    >
      <div className={styles.toolColumn}>
        <CompetitorFinder />
      </div>
    </ToolLanding>
  );
}
