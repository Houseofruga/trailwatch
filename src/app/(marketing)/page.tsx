import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JsonLd } from "@/components/JsonLd";
import { HeroScene } from "./HeroScene";
import { MarketingSections } from "./MarketingSections";
import { structuredData } from "./structuredData";
import styles from "./page.module.css";

// The root domain (gettrailwatch.com) IS the marketing landing.
// Everyone sees it; signed-in visitors get a "Dashboard" link into the app.
export const metadata: Metadata = {
  // Absolute so the root layout's "%s — TrailWatch" template doesn't double up.
  title: {
    absolute: "TrailWatch — competitor tracking for founders, one email a week",
  },
  description:
    "Add your competitors, get one plain-English email a week on what actually changed — pricing, features, messaging. AI summaries on every plan, even free.",
  alternates: { canonical: "/" },
};

// Inline copies of the app's nav icons so the hero screenshot matches the real
// sidebar (kept local to the marketing route; no runtime import from the app).
function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4">
        <rect x="2.5" y="2.5" width="4.3" height="4.3" />
        <rect x="9.2" y="2.5" width="4.3" height="4.3" />
        <rect x="2.5" y="9.2" width="4.3" height="4.3" />
        <rect x="9.2" y="9.2" width="4.3" height="4.3" />
      </g>
    </svg>
  );
}
function CompetitorsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4">
        <rect x="2.5" y="2.5" width="11" height="11" />
        <rect x="6.25" y="6.25" width="3.5" height="3.5" />
      </g>
    </svg>
  );
}
function BillingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4">
        <rect x="2" y="3.5" width="12" height="9" />
        <line x1="2" y1="6.5" x2="14" y2="6.5" />
      </g>
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="square">
        <line x1="2.5" y1="5" x2="13.5" y2="5" />
        <line x1="2.5" y1="11" x2="13.5" y2="11" />
      </g>
      <rect x="9" y="3.5" width="3" height="3" fill="currentColor" />
      <rect x="4" y="9.5" width="3" height="3" fill="currentColor" />
    </svg>
  );
}

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // src/proxy.ts already redirects signed-in visitors away from the landing;
  // this is the belt to its braces. Logged-in users never see the marketing
  // page — only signed-out visitors do.
  if (user) redirect("/dashboard");

  return (
    <>
      <JsonLd data={structuredData()} />
      {/* LCP: the hero sky is a CSS background (HeroScene .sky → /fullBG.webp),
          which the browser discovers late. Preload it at high priority so it
          fetches immediately and paints sooner. */}
      <link rel="preload" as="image" href="/fullBG.webp" fetchPriority="high" />

      {/* ===== SECTION 1 · HERO SCENE (full-sky; copy fades, product centers) */}
      <HeroScene
        hero={
          <>
            <h1 className={styles.title}>
              The competitor tracker built for founders, not enterprises.
            </h1>
            <p className={styles.heroBody}>
              Add your competitors and TrailWatch watches their pages for you — then sends
              one plain-English email a week on what actually changed: pricing, features,
              messaging. A full dashboard’s there when you want to dig in, but you never have
              to babysit one. It just works.
            </p>
            <div className={styles.heroCta}>
              <a
                className={`${styles.btn} ${styles.btnPrimary}`}
                href="/login?mode=signup"
              >
                Start free — no card required
              </a>
            </div>
          </>
        }
      >
        {/* Product screenshot — a Pro account's dashboard, with the real left nav */}
        <div className={styles.shotWrap}>
          <div className={styles.shotScale}>
          <div className={styles.shot}>
            <div className={styles.shotBar}>
              <div className={styles.shotDots}>
                <span className={styles.shotDot} />
                <span className={styles.shotDot} />
                <span className={styles.shotDot} />
              </div>
              <div className={styles.shotUrl}>gettrailwatch.com/dashboard</div>
            </div>

            <div className={styles.appRow}>
              <aside className={styles.side}>
                <div className={styles.sideBrand}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className={styles.sideLogo} src="/logo.svg" alt="TrailWatch" />
                </div>
                <nav className={styles.sideNav}>
                  <div className={`${styles.navItem} ${styles.navItemActive}`}>
                    <DashboardIcon />
                    Dashboard
                    <div className={styles.navBar} />
                  </div>
                  <div className={styles.navItem}>
                    <CompetitorsIcon />
                    Competitors
                  </div>
                  <div className={styles.navItem}>
                    <BillingIcon />
                    Plan &amp; billing
                  </div>
                  <div className={styles.navItem}>
                    <SettingsIcon />
                    Settings
                  </div>
                </nav>

                <div className={styles.sideFoot}>
                  <div className={styles.usage}>
                    <div className={styles.usageHead}>
                      <span className={styles.usagePlan}>Pro plan</span>
                    </div>
                    <div className={styles.meters}>
                      <div className={styles.meterRow}>
                        <span>Competitors</span>
                        <span className={styles.meterValue}>6 / 10</span>
                      </div>
                      <div className={styles.track}>
                        <div className={styles.fill} style={{ width: "60%" }} />
                      </div>
                      <div className={`${styles.meterRow} ${styles.meterRowSpaced}`}>
                        <span>Pages tracked</span>
                        <span className={styles.meterValue}>24 / 100</span>
                      </div>
                      <div className={styles.track}>
                        <div className={styles.fill} style={{ width: "24%" }} />
                      </div>
                    </div>
                  </div>

                  <div className={styles.profile}>
                    <div className={styles.profileRow}>
                      <div className={styles.profileAvatar}>JR</div>
                      <div className={styles.profileText}>
                        <div className={styles.profileName}>Jordan Rivera</div>
                        <div className={styles.profileEmail}>jordan@baseline.co</div>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>

              <div className={styles.appMain}>
                <div className={styles.appHead}>
                  <div className={styles.appHeading}>This week</div>
                  <p className={styles.appSub}>6 competitors · 24 pages tracked</p>
                </div>

                <div className={styles.bStats}>
                  <div className={styles.bStat}>
                    <div className={styles.bStatLabelRow}>
                      <div className={`${styles.bStatIcon} ${styles.bStatIconAmber}`}>◉</div>
                      <span className={styles.bStatLabel}>Changes this week</span>
                    </div>
                    <div className={styles.bStatValue}>9</div>
                  </div>
                  <div className={styles.bStat}>
                    <div className={styles.bStatLabelRow}>
                      <div className={`${styles.bStatIcon} ${styles.bStatIconGreen}`}>◉</div>
                      <span className={styles.bStatLabel}>Pages tracked</span>
                    </div>
                    <div className={styles.bStatValue}>24</div>
                  </div>
                  <div className={styles.bStat}>
                    <div className={styles.bStatLabelRow}>
                      <div className={`${styles.bStatIcon} ${styles.bStatIconWarn}`}>◉</div>
                      <span className={styles.bStatLabel}>Trivial edits filtered</span>
                    </div>
                    <div className={styles.bStatValue}>61</div>
                  </div>
                </div>

                <div className={styles.bList}>
                  <section className={styles.bCard}>
                    <div className={styles.bCardHead}>
                      <div className={styles.bCardHeadLeft}>
                        <div className={styles.bLogo} style={{ background: "#3b4bc4" }}>
                          <svg width="13" height="13" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                            <path d="M9 2.5 15 9 9 15.5 3 9Z" fill="#fff" />
                          </svg>
                        </div>
                        <div className={styles.bName}>Northwind</div>
                        <div className={styles.bDomain}>northwind.com</div>
                      </div>
                      <div className={styles.bMeta}>2 changes this week</div>
                    </div>
                    <div className={styles.bRow}>
                      <div className={styles.bRowLabel}>Pricing</div>
                      <div className={styles.bChange}>
                        <span className={styles.bSummary}>
                          Renamed the Starter tier to “Basic” and moved audit logs up into Pro.
                        </span>
                        <div className={styles.bTime}>2d ago</div>
                      </div>
                    </div>
                    <div className={styles.bRow}>
                      <div className={styles.bRowLabel}>Homepage</div>
                      <div className={styles.bChange}>
                        <span className={styles.bSummary}>
                          Added a “Trusted by 4,000 teams” logo strip below the hero.
                        </span>
                        <div className={styles.bTime}>4d ago</div>
                      </div>
                    </div>
                  </section>

                  <section className={styles.bCard}>
                    <div className={styles.bCardHead}>
                      <div className={styles.bCardHeadLeft}>
                        <div className={styles.bLogo} style={{ background: "#0f9d8a" }}>
                          <svg width="13" height="13" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                            <circle cx="9" cy="9" r="5.2" stroke="#fff" strokeWidth="2" />
                            <line x1="2.6" y1="9" x2="15.4" y2="9" stroke="#fff" strokeWidth="2" />
                          </svg>
                        </div>
                        <div className={styles.bName}>Meridian</div>
                        <div className={styles.bDomain}>meridianhq.com</div>
                      </div>
                      <div className={styles.bMeta}>3 changes this week</div>
                    </div>
                    <div className={styles.bRow}>
                      <div className={styles.bRowLabel}>Changelog</div>
                      <div className={styles.bChange}>
                        <span className={styles.bSummary}>
                          Shipped SSO and a public API; added a “Teams” item to the nav.
                        </span>
                        <div className={styles.bTime}>1d ago</div>
                      </div>
                    </div>
                    <div className={styles.bRow}>
                      <div className={styles.bRowLabel}>Pricing</div>
                      <div className={styles.bChange}>
                        <span className={styles.bSummary}>
                          Introduced annual billing at roughly 20% off monthly.
                        </span>
                        <div className={styles.bTime}>3d ago</div>
                      </div>
                    </div>
                  </section>

                  <section className={styles.bCard}>
                    <div className={styles.bCardHead}>
                      <div className={styles.bCardHeadLeft}>
                        <div className={styles.bLogo} style={{ background: "#7a4dd0" }}>
                          <svg width="13" height="13" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                            <path d="M9 3 15.5 14.5 2.5 14.5Z" fill="#fff" />
                          </svg>
                        </div>
                        <div className={styles.bName}>Vantage</div>
                        <div className={styles.bDomain}>vantage.io</div>
                      </div>
                      <div className={styles.bMeta}>1 change this week</div>
                    </div>
                    <div className={styles.bRow}>
                      <div className={styles.bRowLabel}>Homepage</div>
                      <div className={styles.bChange}>
                        <span className={styles.bSummary}>
                          New headline — now leads with “AI-native”, old tagline gone.
                        </span>
                        <div className={styles.bTime}>5d ago</div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className={styles.bMore}>+ 3 more competitors</div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </HeroScene>

      <MarketingSections />
    </>
  );
}
