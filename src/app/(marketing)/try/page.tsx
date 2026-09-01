import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { TeardownForm } from "../tools/competitor-teardown/TeardownForm";
import { MarketingSections } from "../MarketingSections";
import styles from "./try.module.css";

// "Try it" landing variant: same content as `/`, but the hero lets a visitor run
// a real AI competitor teardown with no signup, then converts. Kept out of the
// index (canonical → `/`) while its role — campaign page vs future homepage — is
// undecided; that's also why it's absent from src/app/sitemap.ts (an allowlist).
export const metadata: Metadata = {
  title: {
    absolute: "Tear down any competitor — free, no signup | TrailWatch",
  },
  description:
    "Paste a competitor's URL and get an instant AI teardown — positioning, pricing, what to watch. Then let TrailWatch email you what changes, every week.",
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
      <SiteHeader />

      {/* ===== HERO · interactive teardown (static split, no scroll animation) */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Free · no signup</span>
            <h1 className={styles.title}>
              Tear down any competitor in <span className={styles.accent}>10 seconds.</span>
            </h1>
            <p className={styles.body}>
              Paste a competitor’s URL — TrailWatch reads their public homepage and pricing
              and hands you an AI teardown: positioning, pricing tiers, and what to watch.
              Then it can email you what changes, every week.
            </p>
            <div className={styles.trust}>
              <span className={styles.trustItem}>
                <span className={styles.trustTick}>✓</span> No card required
              </span>
              <span className={styles.trustItem}>
                <span className={styles.trustTick}>✓</span> Public pages only
              </span>
              <span className={styles.trustItem}>
                <span className={styles.trustTick}>✓</span> AI on every plan
              </span>
            </div>
          </div>

          <div className={styles.heroTool}>
            <TeardownForm signupSrc="hero-try" />
          </div>
        </div>
      </section>

      <MarketingSections />
    </>
  );
}
