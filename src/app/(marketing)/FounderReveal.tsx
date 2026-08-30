"use client";

import { useCallback, useRef, useState } from "react";
import styles from "./page.module.css";

/**
 * Before/after reveal slider for the founder portrait. The Ghibli version sits
 * on top (clipped to the handle position); dragging the handle left reveals the
 * original photo underneath. Starts at 90%. Supports pointer, touch, and
 * keyboard (arrow keys).
 */
export function FounderReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(90);

  const updateFromX = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return; // only while pressed
    updateFromX(e.clientX);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setPos((p) => Math.max(0, p - 4));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
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
    </div>
  );
}
