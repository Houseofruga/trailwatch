"use client";

import { useCallback, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import styles from "./CursorDust.module.css";

type Particle = { id: number; x: number; y: number; dx: number; dy: number; size: number; dur: number };

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Cursor-following lime pixel dust for a CTA. Spread `handlers` on the button/
 * link (which must be position:relative + overflow:visible) and render `dust`
 * inside it. Moving over the button emits pixels that fly outward in random
 * directions, vary in size, and fade — a lively trail rather than a fixed
 * cluster. Particles remove themselves when their drift animation ends.
 */
export function useCursorDust(): {
  handlers: { onMouseMove: (e: MouseEvent<HTMLElement>) => void };
  dust: ReactNode;
} {
  const [particles, setParticles] = useState<Particle[]>([]);
  const idRef = useRef(0);
  const lastRef = useRef(0);

  const spawn = useCallback((x: number, y: number) => {
    if (prefersReducedMotion()) return;
    const now = performance.now();
    if (now - lastRef.current < 28) return; // throttle emission rate
    lastRef.current = now;

    const count = 2 + Math.floor(Math.random() * 3); // 2–4 per emission
    const batch: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 12 + Math.random() * 40; // fly 12–52px outward
      batch.push({
        id: idRef.current++,
        x,
        y,
        dx: Math.cos(angle) * radius,
        dy: Math.sin(angle) * radius,
        size: 1 + Math.floor(Math.random() * 3), // 1–3px
        dur: 480 + Math.random() * 620, // 0.48–1.1s
      });
    }
    // Cap the live set so a fast scrub can't pile up unbounded.
    setParticles((prev) => (prev.length > 70 ? prev.slice(-70) : prev).concat(batch));
  }, []);

  const remove = useCallback((id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handlers = {
    onMouseMove: (e: MouseEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      spawn(e.clientX - rect.left, e.clientY - rect.top);
    },
  };

  const dust =
    particles.length > 0 ? (
      <span className={styles.dust} aria-hidden="true">
        {particles.map((p) => (
          <span
            key={p.id}
            className={styles.particle}
            style={
              {
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                "--dx": `${p.dx}px`,
                "--dy": `${p.dy}px`,
                animationDuration: `${p.dur}ms`,
              } as CSSProperties
            }
            onAnimationEnd={() => remove(p.id)}
          />
        ))}
      </span>
    ) : null;

  return { handlers, dust };
}
