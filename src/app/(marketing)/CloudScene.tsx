"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./page.module.css";

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));

/**
 * Wraps the "why" + pricing sections and drives the floating cloud on scroll.
 * On the why section the cloud drifts in from the left and rests at the right.
 * Scrolling on, the cloud zooms straight toward the viewer — filling the frame
 * and "passing through the lens" — then fades out, revealing the pricing
 * section in its place. Desktop only (hidden < 1040px); no-ops for reduced
 * motion.
 */
export function CloudScene({ children }: { children: ReactNode }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const cloudRef = useRef<HTMLImageElement>(null);
  const whiteRef = useRef<HTMLDivElement>(null);

  // Dense core of one cloud in clouds.webp (fractions of the image), so the zoom
  // grows from an opaque cloud body — not the transparent gap between the two.
  const CORE_X = 0.7;
  const CORE_Y = 0.42;

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const pricing = scene.querySelector<HTMLElement>("section[class*='pricing']");

    const active = () =>
      window.matchMedia("(min-width: 1041px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const clearPricing = () => {
      if (pricing) {
        pricing.style.opacity = "";
        pricing.style.transform = "";
      }
    };

    let raf = 0;
    const apply = () => {
      raf = 0;
      const cloud = cloudRef.current;
      if (!cloud) return;

      const white = whiteRef.current;

      if (!active()) {
        cloud.style.transform = "";
        cloud.style.opacity = "";
        cloud.style.zIndex = "";
        if (white) white.style.opacity = "0";
        clearPricing();
        return;
      }

      const vh = window.innerHeight;
      const rectTop = scene.getBoundingClientRect().top;
      const width = scene.clientWidth;

      if (rectTop > 0) {
        // ENTRANCE / REST — the cloud drifts in from the left (under the text),
        // fading 0 → 1, and settles at its right-edge rest position.
        const inP = clamp((vh - rectTop) / (vh * 0.75));
        const ease = 1 - (1 - inP) * (1 - inP); // ease-out
        const away = 1 - ease; // 1 = fully off/away, 0 = at rest

        const cloudIn = width * 0.5; // starts under the text on the left
        cloud.style.transform = `translate3d(${-away * cloudIn}px, 0, 0) scale(1)`;
        cloud.style.opacity = String(ease);
        cloud.style.zIndex = ""; // behind the why copy (CSS z-index)
        cloud.style.transformOrigin = "";
        if (white) white.style.opacity = "0";
        clearPricing(); // pricing is fully visible until the fly-through begins
        return;
      }

      // EXIT — fly through one cloud into the pricing section.
      const runway = scene.offsetHeight - vh;
      const p = clamp(runway > 0 ? -rectTop / runway : 0);

      // Cloud: bring one dense cloud CORE (not the image center, which is the
      // transparent gap) to the viewport center and scale it up until that cloud
      // engulfs the frame, then fade out ("passing through the lens").
      const coreX = cloud.offsetLeft + cloud.offsetWidth * CORE_X;
      const coreY = cloud.offsetTop + cloud.offsetHeight * CORE_Y;
      const tx = (width / 2 - coreX) * p;
      const ty = (vh / 2 - rectTop - coreY) * p; // toward viewport center
      const scale = 1 + p * 8;
      const fade = clamp((0.95 - p) / (0.95 - 0.7)); // 1 through the peak, → 0 by ~0.95
      cloud.style.zIndex = "5"; // above the pricing section during the fly-through
      cloud.style.transformOrigin = `${CORE_X * 100}% ${CORE_Y * 100}%`;
      cloud.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
      cloud.style.opacity = String(fade);

      // Whiteout: guarantees full coverage at the peak even through the cloud's
      // soft edges — fades in as it engulfs, out as pricing appears.
      if (white) {
        const wIn = clamp((p - 0.45) / (0.6 - 0.45));
        const wOut = clamp((p - 0.65) / (0.9 - 0.65));
        white.style.opacity = String(clamp(wIn - wOut));
      }

      // Pricing: materialises as the whiteout/cloud dissolve.
      if (pricing) {
        const rise = clamp((p - 0.6) / (0.92 - 0.6)); // 0 until ~0.6, → 1 by ~0.92
        pricing.style.opacity = String(rise);
        pricing.style.transform = `scale(${1.03 - rise * 0.03})`;
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={cloudRef} className={styles.whyClouds} src="/clouds.webp" alt="" aria-hidden="true" />
      <div ref={whiteRef} className={styles.flyWhite} aria-hidden="true" />
      {children}
    </div>
  );
}
