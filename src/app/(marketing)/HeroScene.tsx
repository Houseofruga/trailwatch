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
  const heroRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);
  const hillRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const apply = (p: number) => {
      const inv = 1 - p;
      if (heroRef.current) {
        heroRef.current.style.opacity = String(clamp(1 - p * 2.2));
        heroRef.current.style.transform = `translate(0, -50%) translate3d(0, ${-p * 26}px, 0)`;
      }
      if (productRef.current) {
        // Hero: left edge sits on the screen center (translateX 0 from left:50%).
        // Scroll: translateX → -50% brings it to the middle of the screen.
        const y = inv * window.innerHeight * 0.12;
        productRef.current.style.transform = `translate(${-p * 50}%, -50%) translate3d(0, ${y}px, 0)`;
      }
      // Foreground hill grows from the bottom to nestle the product.
      if (hillRef.current) hillRef.current.style.transform = `scale(${1 + p * 0.13})`;
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
        <div className={styles.sky} aria-hidden="true" />
        <SiteHeader onDark />
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
