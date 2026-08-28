import Link from "next/link";
import styles from "./SiteHeader.module.css";

/** Shared top nav — logo, Log in, Start free. Same UI on every public page
 *  (marketing landing, tools, legal). Auth pages use their own logo-only head.
 *
 *  `contentWidth` matches the page's own content column (px) so the logo lines
 *  up with the content below it. Defaults to the landing's 1080. */
export function SiteHeader({ contentWidth = 1080 }: { contentWidth?: number }) {
  return (
    <header className={styles.header}>
      <div className={styles.inner} style={{ maxWidth: contentWidth }}>
        <Link href="/" aria-label="TrailWatch home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.logo} src="/logo.svg" alt="TrailWatch" />
        </Link>
        <div className={styles.actions}>
          <Link className={styles.login} href="/login">
            Log in
          </Link>
          <Link className={styles.cta} href="/login?mode=signup">
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
