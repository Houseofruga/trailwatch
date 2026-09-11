"use client";

import { useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import styles from "./CursorDust.module.css";

// Pixel offsets (px) around the pointer — a small scatter so the dust reads as a
// cluster "at and a bit around" the cursor rather than a single dot.
const OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [7, -4], [-6, 3], [3, 8], [-9, -6], [11, 2], [-2, -10], [8, 9],
  [-12, 1], [13, -8], [1, 12], [-7, -2], [10, -12], [-14, 7], [5, -6], [-4, 11],
];

/**
 * Cursor-following lime pixel dust for a CTA. Spread `handlers` on the button/
 * link (which must be position:relative + overflow:visible) and render `dust`
 * inside it. The dust appears at the pointer and tracks it while hovering, and
 * disappears on leave.
 */
export function useCursorDust(): {
  handlers: {
    onMouseMove: (e: MouseEvent<HTMLElement>) => void;
    onMouseLeave: () => void;
  };
  dust: ReactNode;
} {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const handlers = {
    onMouseMove: (e: MouseEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    onMouseLeave: () => setPos(null),
  };

  const dust = pos ? (
    <span className={styles.dust} style={{ left: pos.x, top: pos.y }} aria-hidden="true">
      {OFFSETS.map(([dx, dy], i) => (
        <span
          key={i}
          className={styles.pixel}
          style={{ "--dx": `${dx}px`, "--dy": `${dy}px`, animationDelay: `${(i % 6) * 45}ms` } as CSSProperties}
        />
      ))}
    </span>
  ) : null;

  return { handlers, dust };
}
