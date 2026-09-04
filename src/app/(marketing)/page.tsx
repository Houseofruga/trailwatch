import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { CompetitorFinder } from "./CompetitorFinder";
import { MarketingSections } from "./MarketingSections";
import { structuredData } from "./structuredData";
import styles from "./home.module.css";

// The homepage: the hero lets a visitor find competitors to watch with no signup
// — the product's own onboarding — then converts. The animated landing variant
// lives at /1 (noindex). This is the indexed, canonical `/` and carries the
// site's structured data.
export const metadata: Metadata = {
  title: {
    absolute: "TrailWatch — competitor tracking for founders, one email a week",
  },
  description:
    "Find your competitors and let TrailWatch watch their pages — one plain-English email a week on what actually changed. Free plan, no card.",
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
      <section className={styles.hero}>
        <div className={styles.sky} aria-hidden="true" />
        <div className={styles.header}>
          <SiteHeader onDark />
        </div>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <h1 className={styles.title}>
              The competitor tracker built for founders, not enterprises.
            </h1>
            <p className={styles.body}>
              Add your competitors and TrailWatch watches their pages for you — then sends
              one plain-English email a week on what actually changed: pricing, features,
              messaging. A full dashboard’s there when you want to dig in, but you never have
              to babysit one. It just works.
            </p>
            <div className={styles.heroCta}>
              <Link href="/login?mode=signup" className={styles.heroCtaBtn}>
                Start free
              </Link>
              <span className={styles.heroCtaNote}>No card required</span>
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
