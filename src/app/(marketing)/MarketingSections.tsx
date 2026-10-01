import { Button } from "@/components/ui/Button";
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
    // `ui`: the app's Shopify-style type and buttons (display: contents keeps the
    // sections' own layout and pinned scroll untouched).
    <div className="ui" style={{ display: "contents" }}>
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
          Competitor intelligence today comes in two flavors: enterprise platforms with
          dashboards, sales calls and budgets in the hundreds a month, or spy tools that dump
          raw numbers for dropshippers to dig through. TrailWatch does one thing, for one kind
          of brand: it tells growing DTC brands what their competitors changed and what it
          means for them, in an alert when it matters and a briefing every Monday.
        </p>
        <div className={styles.callout}>
          Footer tweaks, cookie banners and reordered menus are filtered out before they reach
          you. Sales, launches and price moves aren’t.
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
            <div className={styles.compareCell}>
              Built for enterprise brands and dropshippers
            </div>
            <div className={`${styles.compareCell} ${styles.tw}`}>Built for growing DTC brands</div>
          </div>
          <div className={styles.compareRow}>
            <div className={styles.compareCell}>Dashboards to dig through</div>
            <div className={`${styles.compareCell} ${styles.tw}`}>
              Instant alerts + a Monday briefing in your inbox
            </div>
          </div>
          <div className={styles.compareRow}>
            <div className={styles.compareCell}>Raw numbers and diffs</div>
            <div className={`${styles.compareCell} ${styles.tw}`}>
              Plain English: what changed and what it means for you
            </div>
          </div>
          <div className={styles.compareRow}>
            <div className={styles.compareCell}>“Contact sales” or hundreds a month</div>
            <div className={`${styles.compareCell} ${styles.tw}`}>Free during beta</div>
          </div>
        </div>
        </div>
      </section>
        }
        pricing={
      /* ===================================== SECTION 4 · BETA (was pricing) */
      <section className={styles.pricing}>
        <div className={styles.shellWide}>
        <h2 className={`${styles.h2} ${styles.pricingHeading}`}>
          Free during the beta. Early-access pricing for life.
        </h2>
        <div className={`${styles.planGrid} ${styles.planGridSingle}`}>
          <div className={`${styles.plan} ${styles.planPro}`}>
            <div className={styles.planHead}>
              <div className={styles.planName}>Beta access</div>
              <span className={styles.planBadge}>No card required</span>
            </div>
            <div className={styles.planPrice}>Free while we’re in beta</div>
            <div className={styles.planFeatures}>
              <div>Track up to 10 competitor stores</div>
              <div>Instant alerts for sales, launches, price changes and sell-outs</div>
              <div>A plain-English briefing every Monday</div>
              <div>
                <b>40% off for life</b> when paid plans launch (early-access pricing)
              </div>
            </div>
            <div className={styles.planCta}>
              <Button variant="primary" tall full href="/login?mode=signup">
                Join the beta
              </Button>
            </div>
          </div>
        </div>
        <p className={styles.pricingFoot}>
          No card required. We’ll tell you well before paid plans start, and you can leave
          anytime.
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
              <Button variant="primary" tall href="/login?mode=signup">
                Join the beta — free, no card required
              </Button>
            </div>
            <div className={styles.finalQuiet}>
              Also a great fit for e-commerce agencies managing several brands.
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
    </div>
  );
}
