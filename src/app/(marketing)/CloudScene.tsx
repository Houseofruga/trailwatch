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

      if (!active()) {
        cloud.style.transform = "";
        cloud.style.opacity = "";
        cloud.style.zIndex = "";
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
        clearPricing(); // pricing is fully visible until the fly-through begins
        return;
      }

      // EXIT — fly through the cloud into the pricing section.
      const runway = scene.offsetHeight - vh;
      const p = clamp(runway > 0 ? -rectTop / runway : 0);

      // Cloud: rush toward the viewport center and scale up until it engulfs the
      // frame, then fade out ("passing through the lens").
      const restCenterX = cloud.offsetLeft + cloud.offsetWidth / 2;
      const restCenterY = cloud.offsetTop + cloud.offsetHeight / 2;
      const tx = (width / 2 - restCenterX) * p;
      const ty = (vh / 2 + -rectTop - restCenterY) * p; // toward viewport center
      const scale = 1 + p * 8;
      const fade = clamp((0.95 - p) / (0.95 - 0.55)); // 1 until ~0.55, → 0 by ~0.95
      cloud.style.zIndex = "5"; // above the pricing section during the fly-through
      cloud.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
      cloud.style.opacity = String(fade);

      // Pricing: materialises as the cloud dissolves.
      if (pricing) {
        const rise = clamp((p - 0.45) / (0.9 - 0.45)); // 0 until ~0.45, → 1 by ~0.9
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
      {children}
    </div>
  );
}
