import Link from "next/link";
import styles from "./SiteHeader.module.css";

/** Shared top nav — logo, Log in, Start free. Identical on every public page
 *  (marketing landing, tools, legal): same elements, same landing-width
 *  container. Auth pages use their own logo-only head. */
export function SiteHeader({ onDark = false }: { onDark?: boolean }) {
  return (
    <header className={`${styles.header} ${onDark ? styles.onDark : ""}`}>
      <div className={styles.inner}>
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
