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
      if (!cloud) return;

      if (!active()) {
        cloud.style.transform = "";
        cloud.style.opacity = "";
        cloud.style.zIndex = "";
        cloud.style.transformOrigin = "";
        if (why) why.style.opacity = "";
        if (white) white.style.opacity = "0";
        if (price) price.style.opacity = "";
        return;
      }

      const vh = window.innerHeight;
      const rectTop = scene.getBoundingClientRect().top;
      const width = scene.clientWidth;

      if (rectTop > 0) {
        // ENTRANCE / REST — before the scene pins: the cloud drifts in from the
        // left and settles at its right-edge rest position over the why section.
        const inP = clamp((vh - rectTop) / (vh * 0.75));
        const ease = 1 - (1 - inP) * (1 - inP); // ease-out
        const away = 1 - ease;

        cloud.style.transform = `translate3d(${-away * width * 0.5}px, 0, 0) scale(1)`;
        cloud.style.opacity = String(ease);
        cloud.style.zIndex = "";
        cloud.style.transformOrigin = "";
        if (why) why.style.opacity = "1";
        if (white) white.style.opacity = "0";
        if (price) price.style.opacity = "0"; // pricing hidden until the fly-through
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
      const tx = (width / 2 - coreX) * p;
      const ty = (vh / 2 - coreY) * p; // stage is pinned, so stage coords = viewport
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

      // Pricing layer: materialises over the held why section as the cloud passes.
      if (price) {
        const rise = clamp((p - 0.72) / (0.96 - 0.72));
        price.style.opacity = String(rise);
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
          {pricing}
        </div>
      </div>
    </div>
  );
}
