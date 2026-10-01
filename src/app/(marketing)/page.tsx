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
// lives at /1 (noindex). This is the indexed, canonical `/` and carries the
// site's structured data.
const TITLE = "TrailWatch — competitor briefings for Shopify brands";
const DESCRIPTION =
  "Track your competitors' products, prices, sales and stock. Instant alerts for big moves and a plain-English briefing every Monday. Free during beta.";

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
              Know what your competitors changed this week, and what to do about it.
            </h1>
            <p className={styles.body}>
              Add the stores you compete with. TrailWatch tracks their products, prices, sales
              and stock, alerts you the moment they make a big move, and sends a plain-English
              briefing every Monday. No dashboards to babysit.
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
