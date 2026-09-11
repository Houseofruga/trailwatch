"use client";

import Link from "next/link";
import { BoltIcon } from "./icons";
import { useCursorDust } from "./CursorDust";
import styles from "./UpgradeCta.module.css";

/**
 * The inline "Upgrade to Pro" nudge — a Link to /billing styled as the shared
 * upgrade CTA (black, green text, filled bolt prefix) with cursor-following lime
 * pixel dust. Used by the at-cap prompts and the sidebar. The real Paddle
 * checkout button reuses the same stylesheet + useCursorDust so all upgrade CTAs
 * match.
 */
export function UpgradeCta({
  href = "/billing",
  label = "Upgrade to Pro",
  full = false,
  className,
}: {
  href?: string;
  label?: string;
  full?: boolean;
  className?: string;
}) {
  const { handlers, dust } = useCursorDust();
  return (
    <Link
      href={href}
      className={`${styles.cta}${full ? ` ${styles.full}` : ""}${className ? ` ${className}` : ""}`}
      {...handlers}
    >
      <BoltIcon size={18} />
      {label}
      {dust}
    </Link>
  );
}
