import Link from "next/link";
import { BoltIcon } from "./icons";
import styles from "./UpgradeCta.module.css";

/**
 * The inline "Upgrade to Pro" nudge — a Link to /billing styled as the shared
 * upgrade CTA (black, green text, filled bolt prefix). Used by the at-cap
 * prompts and the sidebar. The real Paddle checkout button reuses the same
 * stylesheet directly (features/billing/UpgradeButton) so all upgrade CTAs match.
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
  return (
    <Link
      href={href}
      className={`${styles.cta}${full ? ` ${styles.full}` : ""}${className ? ` ${className}` : ""}`}
    >
      <BoltIcon size={14} />
      {label}
    </Link>
  );
}
