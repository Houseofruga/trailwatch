import { SiteFooter } from "@/components/SiteFooter";
import { StepsScroller } from "./StepsScroller";
import { CloudScene } from "./CloudScene";
import { FounderReveal } from "./FounderReveal";
import { FAQ } from "./structuredData";
import styles from "./page.module.css";

const FOUNDER_X_URL = "https://x.com/thatguydongre";

/**
 * Everything on the marketing landing BELOW the hero: how-it-works, the cloud
 * fly-through (why + pricing), FAQ, the final CTA + founder reveal, and footer.
 * Shared verbatim by the homepage (`/`, finder hero) and the animated landing
 * variant (`/1`) so the two pages can never drift on pricing, copy, or FAQ —
 * only their heroes differ.
 */
export function MarketingSections() {
  return (
    <>
      {/* ================================== SECTION 2 · HOW IT WORKS */}
      <StepsScroller />

      {/* Pinned cloud fly-through: the why section holds while the cloud zooms
          through and reveals the pricing section in its place. */}
      <CloudScene
        why={
      /* ================================== SECTION 3 · WHY TRAILWATCH */
      <section className={styles.why}>
        <div className={styles.shellWide}>
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
            <div className={`${styles.compareCell} ${styles.tw}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.compareLogo} src="/logo.svg" alt="TrailWatch" />
            </div>
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
        </div>
      </section>
        }
        pricing={
      /* ===================================== SECTION 4 · PRICING */
      <section className={styles.pricing}>
        <div className={styles.shellWide}>
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
              $15.83<span className={styles.planPer}>/mo</span>
              <div className={styles.planPer}>
                billed annually ($190/yr, 2 months free). Or $19/mo month-to-month.
              </div>
            </div>
            <div className={styles.planFeatures}>
              <div>10 competitors</div>
              <div>100 pages</div>
              <div>Daily checks</div>
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
          No per-seat fees. Month-to-month or save with annual — your call. And the AI
          summaries work on the free plan too, not gated behind an upgrade.
        </p>
        </div>
      </section>
        }
      />

      {/* ========================================= SECTION 5 · FAQ */}
      <section className={`${styles.faq} ${styles.shellWide}`}>
        <h2 className={`${styles.h2} ${styles.faqHeading}`}>Questions, answered.</h2>
        <div className={styles.faqList}>
          {/* Two independent columns so opening one item never stretches the
              other. First half left, second half right — stacks in order on
              narrow screens. */}
          {[
            FAQ.slice(0, Math.ceil(FAQ.length / 2)),
            FAQ.slice(Math.ceil(FAQ.length / 2)),
          ].map((col, i) => (
            <div key={i} className={styles.faqCol}>
              {col.map((item) => (
                <details key={item.q} className={styles.faqItem}>
                  <summary className={styles.faqQ}>{item.q}</summary>
                  <p className={styles.faqA}>{item.a}</p>
                </details>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* =============================== SECTION 6 · FINAL CTA + TRUST */}
      <section className={styles.final}>
        <div className={`${styles.finalInner} ${styles.shellWide}`}>
          <div className={styles.finalText}>
            <h2 className={`${styles.h2} ${styles.finalHeading}`}>
              Built by one indie founder, not a faceless enterprise.
            </h2>
            <p className={styles.finalBody}>
              TrailWatch is built and run by a single indie founder. That means honest pricing,
              no growth-hack dark patterns, and you can actually reach the person who built it.
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
          {/* Founder portrait — Ghibli/original before-after reveal slider. */}
          <figure className={styles.finalPortrait}>
            <FounderReveal />
            <figcaption className={styles.portraitCaption}>
              <span className={styles.portraitName}>Chandan Dongre</span>
              <span className={styles.portraitRole}>
                Indie founder, TrailWatch
              </span>
              <a
                className={styles.portraitSocial}
                href={FOUNDER_X_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chandan on X (Twitter)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
                </svg>
              </a>
            </figcaption>
          </figure>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
