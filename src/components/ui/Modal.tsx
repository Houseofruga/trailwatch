"use client";

import { useEffect, useId, useRef } from "react";
import { IconX } from "./icons";
import styles from "./Modal.module.css";

/** Centered dialog over a dimmed page. Escape and the × close it; focus moves in on open. */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width,
}: {
  open: boolean;
  /** Wider than the default 480px (Add competitor with suggestions: 560). */
  width?: number;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  // Latest onClose without re-running the effect: callers pass a new function
  // each render, and re-running would move focus back to the first field on
  // every keystroke.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    // A text field first (so typing starts there), else the first button.
    const first =
      panel.current?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea") ??
      panel.current?.querySelector<HTMLElement>("button:not([aria-label='Close'])");
    (first ?? panel.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className={styles.overlay} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} className={styles.modal} style={width ? { width } : undefined} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button type="button" aria-label="Close" className={styles.close} onClick={onClose}>
            <IconX size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        <div className={styles.foot}>{footer}</div>
      </div>
    </div>
  );
}
