"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./StepsScroller.module.css";

/**
 * Pinned "how it works" section. The heading and the three steps stay fixed
 * while the section scrolls; scroll progress selects the active step, which
 * becomes a white card (the others dim) and crossfades the matching panel in
 * on the right. Reduced-motion / narrow viewports unpin it and show every
 * step and panel stacked (see the CSS media queries).
 */
const STEPS = [
  {
    num: "01",
    body: "Paste their pricing, homepage, or changelog URLs — you’ll see a snapshot captured on the spot.",
  },
  {
    num: "02",
    body: "Daily checks, trivial edits filtered out. Nothing to configure — no frequencies to set, no alert rules to tune, no dashboard to check.",
  },
  {
    num: "03",
    body: "Grouped by competitor, in plain English. “Linear raised their Business plan from $14 to $16.” Read it in 30 seconds — or open the dashboard to see every change in full.",
  },
];

export function StepsScroller() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const runway = scene.offsetHeight - window.innerHeight;
      const scrolled = -scene.getBoundingClientRect().top;
      const p = Math.max(0, Math.min(1, runway > 0 ? scrolled / runway : 0));
      // Split the runway into equal bands, one per step.
      const idx = Math.min(STEPS.length - 1, Math.floor(p * STEPS.length));
      setActive(idx);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={sceneRef} className={styles.scene}>
      <div className={styles.stage}>
        <div className={styles.shell}>
          <h2 className={styles.h2}>Set it once. Then forget it.</h2>
          <div className={styles.grid}>
            <div className={styles.steps}>
              {STEPS.map((s, i) => (
                <div
                  key={s.num}
                  className={`${styles.step} ${i === active ? styles.stepActive : ""}`}
                >
                  <div className={styles.stepNum}>{s.num}</div>
                  <p className={styles.stepBody}>{s.body}</p>
                </div>
              ))}
            </div>
            <div className={styles.media}>
              {STEPS.map((s, i) => (
                <div
                  key={s.num}
                  className={`${styles.panel} ${i === active ? styles.panelActive : ""}`}
                  aria-hidden="true"
                >
                  {i === 0 && (
                    <div className={`${styles.frame} ${styles.frameBlue}`}>
                      <div className={styles.card}>
                        <div className={styles.cardTitle}>Add a competitor</div>
                        <div className={styles.urlField}>
                          <span className={styles.urlText}>linear.app/pricing</span>
                        </div>
                        <div className={styles.snap}>
                          <div className={styles.snapShot}>
                            <div className={styles.snapNav}>
                              <span className={styles.snapNavDot} />
                              <span className={styles.snapNavBar} />
                            </div>
                            <div className={styles.snapCols}>
                              <div className={styles.snapCol}>
                                <span className={styles.snapPrice} />
                                <span className={styles.snapLine} />
                                <span className={styles.snapLine} />
                                <span className={styles.snapLineShort} />
                              </div>
                              <div className={styles.snapCol}>
                                <span className={styles.snapPrice} />
                                <span className={styles.snapLine} />
                                <span className={styles.snapLine} />
                                <span className={styles.snapLineShort} />
                              </div>
                            </div>
                          </div>
                          <div className={styles.snapFoot}>
                            <span className={styles.snapBadge}>✓ Snapshot captured</span>
                            <span className={styles.snapMeta}>Linear · Pricing</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {i === 1 && (
                    <div className={`${styles.frame} ${styles.frameWarm}`}>
                      <div className={styles.card}>
                        <div className={styles.cardHead}>
                          <span className={styles.cardTitle}>Daily check</span>
                          <span className={styles.cardHost}>linear.app/pricing</span>
                        </div>
                        <div className={styles.diffRows}>
                          <div className={styles.diffRow}>
                            <span className={styles.diffTrivial}>Footer year 2025 → 2026</span>
                            <span className={styles.tagMuted}>filtered</span>
                          </div>
                          <div className={styles.diffRow}>
                            <span className={styles.diffTrivial}>Cookie notice reworded</span>
                            <span className={styles.tagMuted}>filtered</span>
                          </div>
                          <div className={`${styles.diffRow} ${styles.diffKept}`}>
                            <span className={styles.diffText}>
                              Business plan <b>$14 → $16</b>
                            </span>
                            <span className={styles.tagAccent}>flagged</span>
                          </div>
                        </div>
                        <div className={styles.cardFoot}>47 trivial edits filtered this week</div>
                      </div>
                    </div>
                  )}

                  {i === 2 && (
                    <div className={`${styles.frame} ${styles.frameGreen}`}>
                      <div className={styles.card}>
                        <div className={styles.mailToolbar} aria-hidden="true">
                          {/* back */}
                          <svg viewBox="0 0 24 24" className={styles.mailTool}>
                            <path
                              d="M15 18l-6-6 6-6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span className={styles.mailToolSpacer} />
                          {/* archive */}
                          <svg viewBox="0 0 24 24" className={styles.mailTool}>
                            <path
                              d="M3 6h18v3H3zM5 9v10h14V9M9 13h6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          {/* trash */}
                          <svg viewBox="0 0 24 24" className={styles.mailTool}>
                            <path
                              d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          {/* reply */}
                          <svg viewBox="0 0 24 24" className={styles.mailTool}>
                            <path
                              d="M9 8L4 12l5 4M4 12h9a6 6 0 016 6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <div className={styles.mailSubjectRow}>
                          Your competitors this week
                          <span className={styles.mailChangeCount}>· 7 changes</span>
                        </div>
                        <div className={styles.mailSenderRow}>
                          <span className={styles.mailAvatar} aria-hidden="true">
                            <svg
                              className={styles.mailAvatarMark}
                              viewBox="-5 97 699 577"
                              fill="none"
                            >
                              <path
                                d="M550.681 638.5C321.681 685.5 99.9061 421.1 283.506 341.5C513.006 242 986.392 443 328.006 443C-300.994 443 195.181 87 509.181 130.5"
                                stroke="currentColor"
                                strokeWidth="50"
                                strokeLinecap="round"
                              />
                            </svg>
                          </span>
                          <div className={styles.mailSenderText}>
                            <div className={styles.mailSender}>TrailWatch</div>
                            <div className={styles.mailAddr}>
                              weekly@gettrailwatch.com
                            </div>
                          </div>
                          <div className={styles.mailRight}>
                            <span className={styles.mailTime}>9:02 AM</span>
                            <span className={styles.mailStar} aria-hidden="true">
                              ☆
                            </span>
                          </div>
                        </div>
                        <div className={styles.mailBody}>
                          <div className={styles.mailGroup}>
                            <div className={styles.mailComp}>Northwind</div>
                            <div className={styles.mailItem}>
                              Renamed the Starter tier to “Basic”
                            </div>
                          </div>
                          <div className={styles.mailGroup}>
                            <div className={styles.mailComp}>Linear</div>
                            <div className={styles.mailItem}>
                              Business plan raised <b>$14 → $16</b>
                            </div>
                          </div>
                          <div className={styles.mailGroup}>
                            <div className={styles.mailComp}>Meridian</div>
                            <div className={styles.mailItem}>Shipped SSO and a public API</div>
                          </div>
                        </div>
                        <div className={styles.mailCta}>Open dashboard</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
