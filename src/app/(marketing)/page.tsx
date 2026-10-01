import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { Button } from "@/components/ui/Button";
import { CompetitorFinder } from "./CompetitorFinder";
import { MarketingSections } from "./MarketingSections";
import { structuredData } from "./structuredData";
import styles from "./home.module.css";

// The homepage: the hero lets a visitor find competitors to watch with no signup
// — the product's own onboarding — then converts. The animated landing variant
// was retired 2026-10-01. This is the indexed, canonical `/` and carries the
// site's structured data.
const TITLE = "TrailWatch — competitor briefings for Shopify brands";
const DESCRIPTION =
  "Your competitors' launches, price cuts, sales and sell-outs, in your inbox within hours, plus a plain-English briefing every Monday. Free during beta.";

// OG / Twitter title and description come from the root layout (same text).
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
};

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in visitors go straight to the app.
  if (user) redirect("/dashboard");

  return (
    <>
      <JsonLd data={structuredData()} />

      {/* LCP: same sky background as the homepage hero — preload it high-priority. */}
      <link rel="preload" as="image" href="/fullBG.webp" fetchPriority="high" />

      {/* ===== HERO · same sky as the homepage; the finder replaces the product mock.
          Static (no pinned scroll animation) so the tool stays put and usable. */}
      <section className={`ui ${styles.hero}`}>
        <div className={styles.sky} aria-hidden="true" />
        <div className={styles.header}>
          <SiteHeader onDark />
        </div>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <h1 className={styles.title}>
              Your competitor started a sale on Thursday. You found out on Monday.
            </h1>
            <p className={styles.body}>
              TrailWatch watches the stores you compete with: every launch, price cut, sale and
              sell-out. Big moves reach you within hours. Everything else arrives in one
              plain-English briefing every Monday, with what it means for your store and what
              to do about it.
            </p>
            <div className={styles.heroCta}>
              <Button variant="primary" tall href="/login?mode=signup">
                Join the beta
              </Button>
              <span className={styles.heroCtaNote}>Free during beta · No card required</span>
            </div>
          </div>

          <div className={styles.heroTool}>
            <CompetitorFinder />
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.hill}
          src="/HillFG.webp"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
        />
      </section>

      <MarketingSections />
    </>
  );
}
