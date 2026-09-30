"use client";

// Tooltip and PopoverMenu: the two small floating pieces.
import { useEffect, useId, useRef, useState } from "react";
import styles from "./Overlay.module.css";

/** Dark hint shown on hover or keyboard focus of its child. */
export function Tooltip({ text, align = "start", children }: { text: string; align?: "start" | "end"; children: React.ReactNode }) {
  const id = useId();
  return (
    <span className={styles.tipAnchor} tabIndex={0} aria-describedby={id}>
      {children}
      <span role="tooltip" id={id} className={`${styles.tip} ${align === "end" ? styles.tipEnd : ""}`}>
        {text}
      </span>
    </span>
  );
}

export type MenuItem = {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  critical?: boolean;
  /** Draw a divider above this item. */
  separated?: boolean;
};

/** A trigger button that opens a list of actions. Closes on Escape, outside click or pick. */
export function PopoverMenu({
  trigger,
  items,
  align = "end",
  width = 220,
}: {
  trigger: (props: { onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "menu" }) => React.ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    root.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className={styles.menuRoot}>
      {trigger({ onClick: () => setOpen((o) => !o), "aria-expanded": open, "aria-haspopup": "menu" })}
      {open ? (
        <ul role="menu" className={`${styles.menu} ${align === "start" ? styles.menuStart : ""}`} style={{ width }}>
          {items.map((item) => (
            <li key={item.label} role="none">
              {item.separated ? <div role="separator" className={styles.separator} /> : null}
              <button
                type="button"
                role="menuitem"
                className={`${styles.item} ${item.critical ? styles.itemCritical : ""}`}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
