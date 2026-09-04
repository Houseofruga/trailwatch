import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { CompetitorFinder } from "./CompetitorFinder";
import { MarketingSections } from "../MarketingSections";
import styles from "./try.module.css";

// "Try it" landing variant: same content as `/`, but the hero lets a visitor
// find competitors to watch with no signup — the product's own onboarding — then
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

// Real, curated changes (mirrors src/features/demo/demoFeed.ts) — the "your Monday
// email" preview. Honest examples of the actual weekly digest.
const SAMPLE_DIGEST = [
  { comp: "Linear", line: "Business plan raised $14 → $16 / user" },
  { comp: "Northwind", line: "Renamed the Starter tier to “Basic”" },
  { comp: "Meridian", line: "Shipped SSO and a public API" },
];

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

      {/* ===== HERO · find-your-competitors (static split, no scroll animation) */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Free · no signup to try</span>
            <h1 className={styles.title}>
              The competitor tracker built for founders, not enterprises.
            </h1>
            <p className={styles.body}>
              Add your competitors and TrailWatch watches their pages for you — then sends
              one plain-English email a week on what actually changed: pricing, features,
              messaging. A full dashboard’s there when you want to dig in, but you never have
              to babysit one. It just works.
            </p>

            {/* Payoff preview: what lands in your inbox */}
            <div className={styles.preview} aria-hidden="true">
              <div className={styles.previewHead}>
                <span className={styles.previewFrom}>TrailWatch</span>
                <span className={styles.previewSubj}>Your competitors this week · 3 changes</span>
              </div>
              <ul className={styles.previewList}>
                {SAMPLE_DIGEST.map((d) => (
                  <li key={d.comp} className={styles.previewItem}>
                    <span className={styles.previewComp}>{d.comp}</span>
                    <span className={styles.previewLine}>{d.line}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.previewFoot}>+ 47 trivial edits filtered</div>
            </div>
          </div>

          <div className={styles.heroTool}>
            <CompetitorFinder />
          </div>
        </div>
      </section>

      <MarketingSections />
    </>
  );
}
