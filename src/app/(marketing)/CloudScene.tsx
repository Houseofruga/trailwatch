"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./page.module.css";

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));

/**
 * Pinned cloud fly-through. The why + pricing sections are overlaid layers in a
 * sticky 100vh stage. On the way in, the cloud drifts from the left and rests at
 * the right of the (held) why section. As the scene pins and you scroll on, the
 * cloud zooms one of its clouds straight toward the viewer, fills the frame
 * (whiteout guarantees full coverage), and the pricing layer crossfades in over
 * the held why section — so pricing appears in the why's place. Desktop only;
 * mobile / reduced-motion stack the two sections in normal flow.
 */
export function CloudScene({ why, pricing }: { why: ReactNode; pricing: ReactNode }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const whyRef = useRef<HTMLDivElement>(null);
  const cloudRef = useRef<HTMLImageElement>(null);
  const whiteRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);
  const priceContentRef = useRef<HTMLDivElement>(null); // pricing content only (scaled)

  // Dense core of one cloud in clouds.webp (fractions of the image), so the zoom
  // grows from an opaque cloud body — not the transparent gap between the two.
  const CORE_X = 0.7;
  const CORE_Y = 0.42;

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const active = () =>
      window.matchMedia("(min-width: 1041px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    const apply = () => {
      raf = 0;
      const why = whyRef.current;
      const cloud = cloudRef.current;
      const white = whiteRef.current;
      const price = priceRef.current;
      const content = priceContentRef.current;
      if (!cloud) return;

      if (!active()) {
        cloud.style.transform = "";
        cloud.style.opacity = "";
        cloud.style.zIndex = "";
        cloud.style.transformOrigin = "";
        if (why) why.style.opacity = "";
        if (white) white.style.opacity = "0";
        if (price) {
          price.style.opacity = "";
          price.style.backgroundSize = "";
        }
        if (content) content.style.transform = "";
        return;
      }

      const vh = window.innerHeight;
      const rectTop = scene.getBoundingClientRect().top;
      const width = scene.clientWidth;

      if (rectTop > 0) {
        // REST — before the scene pins: no entrance animation. The cloud simply
        // sits at its rest position over the why section (full opacity, no drift).
        cloud.style.transform = "translate3d(0, 0, 0) scale(1)";
        cloud.style.opacity = "1";
        cloud.style.zIndex = "";
        cloud.style.transformOrigin = "";
        if (why) why.style.opacity = "1";
        if (white) white.style.opacity = "0";
        if (price) {
          price.style.opacity = "0"; // pricing hidden until the fly-through
          price.style.backgroundSize = ""; // sky at rest (cover) until the hold
        }
        if (content) content.style.transform = "scale(0.9)"; // zoomed-out start (invisible at opacity 0)
        return;
      }

      // EXIT — the stage is pinned; fly one cloud through into the pricing layer.
      // The reveal plays over a fixed 800px of scroll (kept in sync with the
      // scene's "800px" in the CSS). Past that, p clamps to 1 and everything
      // holds at its final state while the extra pinned runway scrolls by — so
      // the revealed pricing lingers before the stage unpins into the FAQ.
      const REVEAL_PX = 800;
      const p = clamp(-rectTop / REVEAL_PX);

      // Cloud: bring one dense core to the viewport center and scale it up until
      // that cloud engulfs the frame, then fade out ("through the lens").
      const coreX = cloud.offsetLeft + cloud.offsetWidth * CORE_X;
      const coreY = cloud.offsetTop + cloud.offsetHeight * CORE_Y;
      // Bow the path downward mid-flight so the core arcs (dips down, then rises
      // back to centre) instead of tracking a dead-straight diagonal. The sine
      // is 0 at both ends, so the rest spot (p=0) and centred peak (p=1) are
      // unchanged — only the trajectory between them curves.
      const DIP = 220;
      const arc = Math.sin(p * Math.PI) * DIP;
      const tx = (width / 2 - coreX) * p;
      const ty = (vh / 2 - coreY) * p + arc; // stage is pinned, so stage coords = viewport
      const scale = 1 + p * 18; // grow ~2x further before fading out
      const fade = clamp((0.98 - p) / (0.98 - 0.82)); // hold opacity, then fade late
      cloud.style.zIndex = "5";
      cloud.style.transformOrigin = `${CORE_X * 100}% ${CORE_Y * 100}%`;
      cloud.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
      cloud.style.opacity = String(fade);

      // Why layer: hide it while the whiteout still fully covers the frame (peak
      // ~0.72–0.82), so once the cloud/whiteout start fading and pricing rises,
      // the old "big tools" section can never peek through behind them.
      if (why) {
        why.style.opacity = String(clamp(1 - (p - 0.72) / (0.8 - 0.72)));
      }

      // Whiteout: guarantees full coverage at the peak through the cloud's edges.
      if (white) {
        const wIn = clamp((p - 0.55) / (0.72 - 0.55));
        const wOut = clamp((p - 0.82) / (0.96 - 0.82));
        white.style.opacity = String(clamp(wIn - wOut));
      }

      // Pricing layer: materialises over the held why section as the cloud passes,
      // then — once the reveal is done and the stage just holds — the sky slowly
      // zooms in (from centre) across the remaining pinned runway. `auto 100%`
      // equals the resting `cover` (the sky is height-driven), so h=0 matches the
      // CSS with no jump, and h→1 scales it up.
      if (price) {
        const rise = clamp((p - 0.72) / (0.96 - 0.72));
        price.style.opacity = String(rise);
        const holdPx = Math.max(0, scene.offsetHeight - vh - REVEAL_PX);
        const h = holdPx > 0 ? clamp((-rectTop - REVEAL_PX) / holdPx) : 0;
        price.style.backgroundSize = `auto ${100 + h * 40}%`;

        // Content: the heading + plan grid grow from slightly zoomed-out to regular
        // size. It starts as pricing appears (~p 0.72) and keeps growing PAST the
        // cloud's full fade (~p 0.98), settling around 60% into the hold — so the
        // zoom is still visibly moving after the cloud is gone, yet still finishes
        // sooner than the sky's full-length zoom above. Driven off raw pinned scroll
        // (`-rectTop`), not `p`/`rise` (which clamp at the reveal band's end), so it
        // can continue through the hold. Eased so it decelerates into place.
        if (content) {
          const czStart = 0.72 * REVEAL_PX; // begins where pricing starts to appear
          const czEnd = REVEAL_PX + holdPx * 0.6; // settles ~60% through the hold
          const cz = clamp((-rectTop - czStart) / (czEnd - czStart));
          const e = 1 - Math.pow(1 - cz, 2); // easeOutQuad — gentle, still moving late
          content.style.transform = `scale(${0.9 + e * 0.1})`;
        }
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={sceneRef} className={styles.cloudScene}>
      <div className={styles.cloudStage}>
        <div ref={whyRef} className={styles.cloudLayer}>{why}</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={cloudRef} className={styles.whyClouds} src="/clouds.webp" alt="" aria-hidden="true" />
        <div ref={whiteRef} className={styles.flyWhite} aria-hidden="true" />
        <div ref={priceRef} className={`${styles.cloudLayer} ${styles.cloudLayerPrice}`}>
          <div ref={priceContentRef} className={styles.priceContent}>
            {pricing}
          </div>
        </div>
      </div>
    </div>
  );
}
