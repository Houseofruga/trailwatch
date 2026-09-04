import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { CompetitorFinder } from "./CompetitorFinder";
import { MarketingSections } from "../MarketingSections";
import styles from "./try.module.css";

// "Try it" landing variant: same content as `/`, but the hero lets a visitor find
// competitors to watch with no signup — the product's own onboarding — then
// converts. Kept out of the index (canonical → `/`) while its role (campaign page
// vs future homepage) is undecided; that's also why it's absent from
// src/app/sitemap.ts (an allowlist).
export const metadata: Metadata = {
  title: {
    absolute: "TrailWatch — competitor tracking for founders, one email a week",
  },
  description:
    "Find your competitors and let TrailWatch watch their pages — one plain-English email a week on what actually changed. Free plan, no card.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/" },
};

export default async function TryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Mirror `/`: signed-in visitors go straight to the app.
  if (user) redirect("/dashboard");

  return (
    <>
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
