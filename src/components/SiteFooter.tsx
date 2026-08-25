import Link from "next/link";
import styles from "./SiteFooter.module.css";

// TODO: replace with your real support email before launch.
const SUPPORT_EMAIL = "support@houseofruga.com";

/** Shared site footer — brand line, legal links, copyright. Used on the
 *  marketing landing and the legal document pages. */
export function SiteFooter() {
  return (
    <footer className={styles.band}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link href="/" aria-label="TrailWatch home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.brandLogo}
                src="/logo.svg"
                alt="TrailWatch"
              />
            </Link>
            <div className={styles.brandTag}>Competitor tracking for founders.</div>
          </div>

          <nav className={styles.legal} aria-label="Legal">
            <div className={styles.legalHead}>Legal</div>
            <ul className={styles.legalLinks}>
              <li>
                <Link href="/terms">Terms of Service</Link>
              </li>
              <li>
                <Link href="/privacy">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/refunds">Refund Policy</Link>
              </li>
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`}>Contact</a>
              </li>
            </ul>
          </nav>
        </div>

        <div className={styles.copyright}>
          © 2026 House of Ruga. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
