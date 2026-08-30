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
                // Panel 0 is a built mockup; 1 & 2 are still flat-color placeholders.
                <div
                  key={s.num}
                  className={`${styles.panel} ${i === 0 ? "" : styles[`panel${i}`]} ${
                    i === active ? styles.panelActive : ""
                  }`}
                  aria-hidden="true"
                >
                  {i === 0 && (
                    <div className={styles.frame}>
                      <div className={styles.addCard}>
                        <div className={styles.addTitle}>Add a competitor</div>
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
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
