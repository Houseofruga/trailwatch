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
      const fade = String(clamp(1 - p * 2.2));
      // Sky is zoomed in at the top and zooms out to full-bleed on scroll.
      // (fullBG keeps clear blue on the left so the copy stays readable.)
      // At the hero, scale up and slide the sky right so the deep-blue left of
      // the image sits behind the copy (the clouds frame the product on the
      // right). All of it eases back to centered full-bleed as it zooms out.
      if (skyRef.current) {
        const dx = inv * window.innerWidth * 0.26;
        skyRef.current.style.transform = `translate3d(${dx}px, ${inv * 48}px, 0) scale(${1 + inv * 1.25})`;
      }
      if (heroRef.current) {
        heroRef.current.style.opacity = fade;
        heroRef.current.style.transform = `translate(0, -50%) translate3d(0, ${-p * 26}px, 0)`;
      }
      if (productRef.current) {
        // Hero: left edge on the screen center. Scroll: slides to center AND
        // grows (bigger, not smaller).
        const W = Math.min(1080, window.innerWidth * 0.62);
        const s0 = 1.2;
        const s1 = 1.35;
        const scale = s0 + p * (s1 - s0);
        const centerAtP0 = window.innerWidth / 2 + (W * s0) / 2; // left edge on center
        const targetCenter = centerAtP0 + p * (window.innerWidth / 2 - centerAtP0);
        const tx = targetCenter - (window.innerWidth / 2 + W / 2);
        const y = inv * window.innerHeight * 0.12;
        productRef.current.style.transform = `translate(${tx}px, -50%) translate3d(0, ${y}px, 0) scale(${scale})`;
      }
      // Hill is mostly below the fold while zoomed in, and rises + grows in as
      // the scene zooms out on scroll.
      if (hillRef.current) {
        // Flipped horizontally, and sat a bit lower so it clears the bottom of
        // the product window in the landscape (scrolled) state.
        hillRef.current.style.transform = `translate3d(0, ${17 + inv * 60}%, 0) scaleX(-1) scale(${1 + p * 0.1})`;
      }
    };

    const mobileMQ = window.matchMedia("(max-width: 860px)");
    const reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Drop any desktop inline transforms so the static mobile CSS layout wins.
    const clearDesktop = () => {
      if (skyRef.current) skyRef.current.style.transform = "";
      if (heroRef.current) {
        heroRef.current.style.transform = "";
        heroRef.current.style.opacity = "";
      }
      if (productRef.current) productRef.current.style.transform = "";
    };

    let raf = 0;
    const update = () => {
      raf = 0;

      // Mobile: layers stay put; only the hill drifts right → left on scroll.
      if (mobileMQ.matches) {
        clearDesktop();
        if (hillRef.current) {
          if (reduceMQ.matches) {
            hillRef.current.style.transform = "scaleX(-1)";
          } else {
            const p = clamp(-scene.getBoundingClientRect().top / window.innerHeight);
            const tx = (0.5 - p) * window.innerWidth * 0.24;
            hillRef.current.style.transform = `translate3d(${tx}px, 0, 0) scaleX(-1)`;
          }
        }
        return;
      }

      if (reduceMQ.matches) {
        apply(1);
        return;
      }
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
    mobileMQ.addEventListener("change", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      mobileMQ.removeEventListener("change", onScroll);
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
