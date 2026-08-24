import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

// The subdomain root (trailwatch.houseofruga.com) IS the marketing landing.
// Everyone sees it; signed-in visitors get a "Dashboard" link into the app.
export const metadata: Metadata = {
  title: "TrailWatch — competitor tracking for founders, one email a week",
  description:
    "Add your competitors, get one plain-English email a week on what actually changed — pricing, features, messaging. AI summaries on every plan, even free. By House of Ruga.",
};

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthed = Boolean(user);

  return (
    <>
      <header className={`${styles.header} ${styles.shell}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.headerImg} src="/logo.svg" alt="TrailWatch" />
        <div className={styles.headerActions}>
          {isAuthed ? (
            <a className={`${styles.btn} ${styles.btnPrimary}`} href="/dashboard">
              Dashboard →
            </a>
          ) : (
            <>
              <a className={styles.headerLogin} href="/login">
                Log in
              </a>
              <a
                className={`${styles.btn} ${styles.btnPrimary}`}
                href="/login?mode=signup"
              >
                Start free
              </a>
            </>
          )}
        </div>
      </header>

      {/* ============================================ SECTION 1 · HERO */}
      <section className={`${styles.hero} ${styles.shell}`}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>TrailWatch — by House of Ruga</div>
          <h1 className={styles.title}>
            The competitor tracker built for founders, not enterprises.
          </h1>
          <p className={styles.heroBody}>
            Add your competitors. Get one plain-English email a week on what actually
            changed — pricing, features, messaging. No dashboard to babysit, no monitors
            to configure, no premium tier just to unlock the AI. It just works.
          </p>
          <div className={styles.heroCta}>
            <a
              className={`${styles.btn} ${styles.btnPrimary}`}
              href="/login?mode=signup"
            >
              Start free — no card required
            </a>
          </div>
        </div>

        <div className={styles.dash}>
          <div className={styles.dashTop}>
            <div className={styles.dashTitle}>This week</div>
            <div className={styles.dashCount}>
              7 meaningful changes across 4 competitors
            </div>
          </div>
          <div className={styles.dashRow}>
            <div className={styles.dashTag}>Pricing</div>
            <div style={{ flex: 1 }}>
              <div className={styles.dashName}>Northwind</div>
              <div className={styles.dashChange}>
                Renamed the Starter tier to “Basic” and moved audit logs up into Pro.
              </div>
            </div>
          </div>
          <div className={styles.dashRow}>
            <div className={styles.dashTag}>Homepage</div>
            <div style={{ flex: 1 }}>
              <div className={styles.dashName}>Vantage</div>
              <div className={styles.dashChange}>
                New headline — now leads with “AI-native” and dropped the old tagline.
              </div>
            </div>
          </div>
          <div className={styles.dashRow}>
            <div className={styles.dashTag}>Changelog</div>
            <div style={{ flex: 1 }}>
              <div className={styles.dashName}>Meridian</div>
              <div className={styles.dashChange}>
                Shipped SSO and a public API, and added a “Teams” section to the nav.
              </div>
            </div>
          </div>
          <div className={styles.dashFoot}>
            Plus 47 trivial edits we filtered out this week — cookie banners, rotating
            testimonials, tracking scripts.
          </div>
        </div>
      </section>

      {/* ================================== SECTION 2 · HOW IT WORKS */}
      <section className={styles.howBand}>
        <div className={`${styles.how} ${styles.shell}`}>
          <h2 className={styles.h2}>Set it once. Then forget it.</h2>
          <div className={styles.howGrid}>
            <div>
              <div className={styles.stepNum}>01</div>
              <div className={styles.stepTitle}>Add your competitors</div>
              <p className={styles.stepBody}>
                Paste their pricing, homepage, or changelog URLs — you’ll see a snapshot
                captured on the spot.
              </p>
            </div>
            <div>
              <div className={styles.stepNum}>02</div>
              <div className={styles.stepTitle}>It runs itself</div>
              <p className={styles.stepBody}>
                Daily checks, trivial edits filtered out. Nothing to configure — no
                frequencies to set, no alert rules to tune, no dashboard to check.
              </p>
            </div>
            <div>
              <div className={styles.stepNum}>03</div>
              <div className={styles.stepTitle}>One email, every Monday</div>
              <p className={styles.stepBody}>
                Grouped by competitor, in plain English. “Northwind moved audit logs into
                their Pro plan.” Read the whole thing in 30 seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================== SECTION 3 · WHY TRAILWATCH */}
      <section className={`${styles.why} ${styles.shell}`}>
        <h2 className={`${styles.h2} ${styles.whyHeading}`}>
          The big tools weren’t built for you.
        </h2>
        <p className={styles.whyBody}>
          Competitor monitoring today comes in two flavors: enterprise software with
          battlecards, sales calls, and budgets you don’t have — or general page-watchers
          that bury the AI summaries behind a premium plan and hand you a dashboard to
          babysit. TrailWatch does one thing, for one kind of person: it tells founders
          what their competitors changed, in one weekly email, at a price that doesn’t
          need approval.
        </p>
        <div className={styles.callout}>
          Last week, it filtered out 47 trivial edits — so your email was 7 lines, not 54.
        </div>
        <div className={styles.compare}>
          <div className={`${styles.compareRow} ${styles.compareHead}`}>
            <div className={styles.compareCell}>The big tools</div>
            <div className={`${styles.compareCell} ${styles.tw}`}>TrailWatch</div>
          </div>
          <div className={styles.compareRow}>
            <div className={styles.compareCell}>Built for enterprise sales teams</div>
            <div className={`${styles.compareCell} ${styles.tw}`}>
              Built for founders &amp; small teams
            </div>
          </div>
          <div className={styles.compareRow}>
            <div className={styles.compareCell}>
              AI summaries locked behind a premium plan
            </div>
            <div className={`${styles.compareCell} ${styles.tw}`}>
              AI summaries on every plan, even free
            </div>
          </div>
          <div className={styles.compareRow}>
            <div className={styles.compareCell}>A dashboard to check daily</div>
            <div className={`${styles.compareCell} ${styles.tw}`}>One email a week</div>
          </div>
          <div className={styles.compareRow}>
            <div className={styles.compareCell}>Metered pricing, “contact sales”</div>
            <div className={`${styles.compareCell} ${styles.tw}`}>
              Flat price, sign up in a minute
            </div>
          </div>
        </div>
      </section>

      {/* ===================================== SECTION 4 · PRICING */}
      <section className={`${styles.pricing} ${styles.shell}`}>
        <h2 className={`${styles.h2} ${styles.pricingHeading}`}>
          Honest pricing. The AI’s never behind a paywall.
        </h2>
        <div className={styles.planGrid}>
          <div className={styles.plan}>
            <div className={styles.planHead}>
              <div className={styles.planName}>Free</div>
              <span className={styles.planBadge}>No card required</span>
            </div>
            <div className={styles.planPrice}>$0</div>
            <div className={styles.planFeatures}>
              <div>2 competitors</div>
              <div>6 pages</div>
              <div>Weekly digest</div>
              <div>AI summaries included</div>
            </div>
            <a
              className={`${styles.btn} ${styles.btnSecondary} ${styles.planCta}`}
              href="/login?mode=signup"
            >
              Start free
            </a>
          </div>

          <div className={`${styles.plan} ${styles.planPro}`}>
            <div className={styles.planHead}>
              <div className={styles.planName}>Pro</div>
              <span className={styles.planBadge}>Cancel anytime</span>
            </div>
            <div className={styles.planPrice}>
              $19<span className={styles.planPer}>/mo</span>
            </div>
            <div className={styles.planFeatures}>
              <div>10 competitors</div>
              <div>100 pages</div>
              <div>Daily checks</div>
              <div>AI summaries included</div>
            </div>
            <a
              className={`${styles.btn} ${styles.btnPrimary} ${styles.planCta}`}
              href="/login?mode=signup"
            >
              Start free, upgrade later
            </a>
          </div>
        </div>
        <p className={styles.pricingFoot}>
          No per-seat fees. No annual lock-in. No “contact sales.” The AI summaries work on
          the free plan too — not gated behind an upgrade.
        </p>
      </section>

      {/* =============================== SECTION 5 · FINAL CTA + TRUST */}
      <section className={styles.final}>
        <div className={`${styles.finalInner} ${styles.shell}`}>
          <h2 className={`${styles.h2} ${styles.finalHeading}`}>
            Built by founders, not a faceless enterprise.
          </h2>
          <p className={styles.finalBody}>
            TrailWatch is made by House of Ruga — a small, bootstrapped studio. That means
            honest pricing, no growth-hack dark patterns, and you can actually reach the
            people who built it.
          </p>
          <div className={styles.finalCta}>
            <a
              className={`${styles.btn} ${styles.btnPrimary}`}
              href="/login?mode=signup"
            >
              Start free — no card required
            </a>
          </div>
          <div className={styles.finalQuiet}>
            Also a great fit for small marketing teams, PMs, and agencies.
          </div>
        </div>
      </section>

      <div className={styles.footerBand}>
        <footer className={`${styles.footer} ${styles.shell}`}>
          <span>TrailWatch — by House of Ruga</span>
          <span>One email a week. That’s the whole product.</span>
        </footer>
      </div>
    </>
  );
}
