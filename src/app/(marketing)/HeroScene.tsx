"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import styles from "./HeroScene.module.css";

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

/**
 * Pinned full-sky hero. The sky (fullBG.webp) fills the stage. Hero state
 * (p = 0): header over the sky, white copy + CTA on the left, and the product
 * window on the right bleeding off the edges. On scroll (p → 1) the copy and
 * CTA fade out and the product slides to the center of the screen.
 * `hero` is the copy block; `children` is the product mock.
 */
export function HeroScene({ hero, children }: { hero: ReactNode; children: ReactNode }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);
  const hillRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const apply = (p: number) => {
      const inv = 1 - p;
      // Sky is zoomed in at the top and zooms out to full-bleed on scroll.
      if (skyRef.current) skyRef.current.style.transform = `scale(${1 + inv * 0.28})`;
      if (heroRef.current) {
        heroRef.current.style.opacity = String(clamp(1 - p * 2.2));
        heroRef.current.style.transform = `translate(0, -50%) translate3d(0, ${-p * 26}px, 0)`;
      }
      if (productRef.current) {
        // Hero: left edge on center, zoomed in. Scroll: slides to center + zooms out.
        const y = inv * window.innerHeight * 0.12;
        const zoom = 1 + inv * 0.2;
        productRef.current.style.transform = `translate(${-p * 50}%, -50%) translate3d(0, ${y}px, 0) scale(${zoom})`;
      }
      // Hill is mostly below the fold while zoomed in, and rises + grows in as
      // the scene zooms out on scroll.
      if (hillRef.current) {
        hillRef.current.style.transform = `translate3d(0, ${inv * 72}%, 0) scale(${1 + p * 0.1})`;
      }
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply(1);
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
        <div className={styles.header}>
          <SiteHeader onDark />
        </div>
        <div ref={heroRef} className={styles.heroText}>
          {hero}
        </div>
        <div ref={productRef} className={styles.product}>
          {children}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={hillRef} className={styles.hill} src="/HillFG.webp" alt="" aria-hidden="true" />
      </div>
    </div>
  );
}
