import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { CompetitorLookup } from "../CompetitorLookup";
import { MarketingSections } from "../MarketingSections";
import styles from "../home.module.css";

// The previous homepage, kept for reference at /v1 after the reworked one went
// live on 2026-10-06. Not indexed, not in the sitemap, and without the site's
// structured data (that belongs to `/`).
export const metadata: Metadata = {
  title: { absolute: "Trailwatch — previous homepage" },
  robots: { index: false, follow: false },
};

export default function PreviousHomePage() {
  return (
    <>
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
              Trailwatch watches the stores you compete with: every launch, price cut, sale and
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
            <CompetitorLookup />
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
