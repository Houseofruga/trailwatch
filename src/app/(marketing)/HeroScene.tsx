"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./HeroScene.module.css";

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

/**
 * The hero and the product-in-landscape are one continuous pinned scene. As the
 * user scrolls the runway, `p` goes 0 → 1 and drives every layer:
 *  - hero copy fades out and lifts,
 *  - the product slides from right to center,
 *  - the sky fades in,
 *  - the hill grows from the bottom and fades in.
 * `hero` is the copy block; `children` is the product mock.
 */
export function HeroScene({ hero, children }: { hero: ReactNode; children: ReactNode }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const wiggleRef = useRef<HTMLImageElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);
  const hillRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const apply = (p: number) => {
      const rightPx = window.innerWidth * 0.42;

      if (skyRef.current) skyRef.current.style.opacity = String(clamp(p * 1.4));
      if (wiggleRef.current) {
        wiggleRef.current.style.opacity = String(clamp(1 - p * 2.2));
        wiggleRef.current.style.transform = `translate(-50%, ${-p * 40}px)`;
      }
      if (heroRef.current) {
        heroRef.current.style.opacity = String(clamp(1 - p * 1.9));
        heroRef.current.style.transform = `translate3d(0, ${-p * 48}px, 0)`;
      }
      if (productRef.current) {
        const x = (1 - p) * rightPx;
        const scale = 0.82 + p * 0.18;
        productRef.current.style.transform = `translate(-50%, 0) translate3d(${x}px, 0, 0) scale(${scale})`;
      }
      if (hillRef.current) {
        hillRef.current.style.opacity = String(clamp(p * 1.6));
        hillRef.current.style.transform = `scale(${1 + p * 0.14})`;
      }
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      apply(1); // show the resolved landscape state, no motion
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const runway = scene.offsetHeight - window.innerHeight;
      const scrolled = -scene.getBoundingClientRect().top;
      apply(clamp(runway > 0 ? scrolled / runway : 0));
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
        <div ref={skyRef} className={styles.sky} aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={wiggleRef} className={styles.wiggle} src="/wiggle.svg" alt="" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={hillRef} className={styles.hill} src="/HillFG.webp" alt="" aria-hidden="true" />
        <div className={styles.stageInner}>
          <div ref={heroRef} className={styles.heroText}>
            {hero}
          </div>
          <div ref={productRef} className={styles.product}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
