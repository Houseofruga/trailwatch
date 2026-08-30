"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./page.module.css";

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));

/**
 * Wraps the "why" + pricing sections and drives their floating decorations on
 * scroll: the cliff slides right and fades out, while the cloud drifts down
 * behind the pricing section and zooms in. Desktop only (the decorations are
 * hidden under 1040px); no-ops for reduced motion.
 */
export function CloudScene({ children }: { children: ReactNode }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const cliffRef = useRef<HTMLImageElement>(null);
  const cloudRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const active = () =>
      window.matchMedia("(min-width: 1041px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    const apply = () => {
      raf = 0;
      const cliff = cliffRef.current;
      const cloud = cloudRef.current;
      if (!cliff || !cloud) return;

      if (!active()) {
        cliff.style.transform = "";
        cliff.style.opacity = "";
        cloud.style.transform = "";
        cloud.style.opacity = "";
        return;
      }

      const vh = window.innerHeight;
      const rectTop = scene.getBoundingClientRect().top;
      const width = scene.clientWidth;

      if (rectTop > 0) {
        // ENTRANCE — as the section scrolls up into view: the cliff flies in
        // from off the right edge, the cloud drifts in from the left (under the
        // text) fading 0 → 1. Both settle at their rest positions.
        const inP = clamp((vh - rectTop) / (vh * 0.75));
        const ease = 1 - (1 - inP) * (1 - inP); // ease-out
        const away = 1 - ease; // 1 = fully off/away, 0 = at rest

        const cliffOff = width - cliff.offsetLeft + 40; // clears the right edge
        cliff.style.transform = `translate3d(${away * cliffOff}px, 0, 0)`;
        cliff.style.opacity = "1";

        const cloudIn = width * 0.5; // starts under the text on the left
        cloud.style.transform = `translate3d(${-away * cloudIn}px, 0, 0) scale(1)`;
        cloud.style.opacity = String(ease);
        return;
      }

      // EXIT — scrolling on toward pricing.
      const runway = scene.offsetHeight - vh;
      const p = clamp(runway > 0 ? -rectTop / runway : 0);

      // Cliff: slide right and fade out early.
      cliff.style.transform = `translate3d(${p * 320}px, 0, 0)`;
      cliff.style.opacity = String(clamp(1 - p * 2.4));

      // Cloud: drift down under the pricing section, sliding to the horizontal
      // center as it goes, and zoom in to 80% of the screen width.
      const centerTx = width / 2 - (cloud.offsetLeft + cloud.offsetWidth / 2);
      const targetScale = (width * 0.8) / cloud.offsetWidth;
      const scale = 1 + p * (targetScale - 1);
      cloud.style.transform = `translate3d(${p * centerTx}px, ${p * 540}px, 0) scale(${scale})`;
      cloud.style.opacity = "1";
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
      <img ref={cliffRef} className={styles.whyCliff} src="/cliff.webp" alt="" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={cloudRef} className={styles.whyClouds} src="/clouds.webp" alt="" aria-hidden="true" />
      {children}
    </div>
  );
}
