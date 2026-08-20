import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeftIcon } from "./icons";
import styles from "./BackLink.module.css";

/** The one back-navigation control — use this everywhere, not a bare link. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.back}>
      <span className={styles.iconBox}>
        <ChevronLeftIcon />
      </span>
      {children}
    </Link>
  );
}
