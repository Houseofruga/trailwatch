"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

/**
 * Before/after reveal slider for the founder portrait. The Ghibli version sits
 * on top (clipped to the handle position); dragging the handle left reveals the
 * original photo underneath. Starts at 90%. Supports pointer, touch, and
 * keyboard (arrow keys). On first scroll into view it plays a one-time nudge
 * (auto-previewing the reveal) and shows a hint until the visitor interacts.
 */
export function FounderReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(90);
  const [showHint, setShowHint] = useState(true);
  const interacted = useRef(false);
  const raf = useRef(0);

  const updateFromX = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  }, []);

  const markInteracted = useCallback(() => {
    interacted.current = true;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
    setShowHint(false);
  }, []);

  // One-time "peek" nudge when the slider first scrolls into view.
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const nudge = () => {
      const start = performance.now();
      const duration = 1300;
      const from = 90;
      const dip = 66;
      const tick = (now: number) => {
        if (interacted.current) return;
        const t = Math.min(1, (now - start) / duration);
        const e = Math.sin(t * Math.PI); // 0 → 1 → 0 (out and back)
        setPos(from - (from - dip) * e);
        raf.current = t < 1 ? requestAnimationFrame(tick) : 0;
      };
      raf.current = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !interacted.current) {
            nudge();
            obs.disconnect();
          }
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    markInteracted();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore — capture is a nicety, not required */
    }
    updateFromX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return; // only while pressed
    updateFromX(e.clientX);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      markInteracted();
      setPos((p) => Math.max(0, p - 4));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      markInteracted();
      setPos((p) => Math.min(100, p + 4));
    }
  };

  return (
    <div
      ref={ref}
      className={styles.reveal}
      role="slider"
      tabIndex={0}
      aria-label="Drag to reveal the original photo"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
    >
      {/* Base layer: the original photo, revealed as the handle moves left. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.revealImg}
        src="/chandanoriginal.webp"
        alt="Chandan, founder of TrailWatch"
        draggable={false}
      />
      {/* Top layer: the Ghibli version, clipped to the handle position. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.revealImg}
        src="/chandanghibli.webp"
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />
      <div className={styles.revealHandle} style={{ left: `${pos}%` }}>
        <span className={styles.revealGrip} />
      </div>
      <div
        className={`${styles.revealHint} ${showHint ? "" : styles.revealHintHidden}`}
        aria-hidden="true"
      >
        ⇄ Drag to compare
      </div>
    </div>
  );
}
