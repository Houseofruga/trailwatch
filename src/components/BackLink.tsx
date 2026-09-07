"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon } from "./icons";
import styles from "./BackLink.module.css";

/**
 * The one back-navigation control — use this everywhere, not a bare link.
 *
 * mode "history" (default): goes back to where the user actually came from,
 * falling back to `href` when there's no in-app history (direct landing, a
 * link from an email, a fresh tab). mode "link": always navigates to `href` —
 * for places where browser-back is unsafe (e.g. after a password-reset flow).
 */
export function BackLink({ href, mode = "history" }: { href: string; mode?: "history" | "link" }) {
  const router = useRouter();
  const label = (
    <>
      <span className={styles.iconBox}>
        <ChevronLeftIcon />
      </span>
      Back
    </>
  );

  if (mode === "link") {
    return (
      <Link href={href} className={styles.back}>
        {label}
      </Link>
    );
  }

  const onBack = () => (window.history.length > 1 ? router.back() : router.push(href));
  return (
    <button type="button" onClick={onBack} className={styles.back}>
      {label}
    </button>
  );
}
