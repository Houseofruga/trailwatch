import Link from "next/link";
import styles from "./SiteFooter.module.css";
import { ContactLink } from "./ContactLink";

const SUPPORT_EMAIL = "trailwatch@houseofruga.com";

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

          <div className={styles.cols}>
            <nav className={styles.legal} aria-label="Tools">
              <div className={styles.legalHead}>Tools</div>
              <ul className={styles.legalLinks}>
                <li>
                  <Link href="/tools/when-was-a-website-last-updated">
                    Last Updated Checker
                  </Link>
                </li>
                <li>
                  <Link href="/tools/sitemap-finder">Sitemap Finder</Link>
                </li>
                <li>
                  <Link href="/tools/robots-txt-tester">Robots.txt Tester</Link>
                </li>
              </ul>
            </nav>

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
                  <ContactLink email={SUPPORT_EMAIL} />
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className={styles.copyright}>
          © 2026 House of Ruga. All rights reserved.
        </div>
      </div>

      {/* Full-bleed hills strip, flush to the bottom on every device. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.hills} src="/FooterHiils.webp" alt="" aria-hidden="true" />
    </footer>
  );
}
