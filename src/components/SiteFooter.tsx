import Link from "next/link";
import styles from "./SiteFooter.module.css";

// Listed by hand: ToolParts imports this footer, so importing TOOLS would be circular.
const FREE_TOOLS = [
  { href: "/tools/shopify-store-checker", name: "Shopify store checker" },
  { href: "/tools/store-snapshot", name: "Store snapshot" },
  { href: "/tools/sale-checker", name: "Sale checker" },
  { href: "/tools/competitor-finder", name: "Competitor finder" },
];

/** Shared site footer — brand line, link columns, copyright. Used on the
 *  marketing landing and the legal document pages. */
export function SiteFooter() {
  return (
    <footer className={`ui ${styles.band}`}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link href="/" aria-label="Trailwatch home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.brandLogo}
                src="/logo.svg"
                alt="Trailwatch"
              />
            </Link>
            <div className={styles.brandTag}>Competitor briefings for Shopify brands.</div>
          </div>

          <div className={styles.cols}>
            <nav className={styles.legal} aria-label="Free tools">
              <div className={styles.legalHead}>Free tools</div>
              <ul className={styles.legalLinks}>
                {FREE_TOOLS.map((t) => (
                  <li key={t.href}>
                    <Link href={t.href}>{t.name}</Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav className={styles.legal} aria-label="Resources">
              <div className={styles.legalHead}>Resources</div>
              <ul className={styles.legalLinks}>
                <li>
                  <Link href="/guides">Guides</Link>
                </li>
                <li>
                  <Link href="/tools">All free tools</Link>
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
              </ul>
            </nav>
          </div>
        </div>

        <div className={styles.copyright}>
          © 2026 Trailwatch, a product of House of Ruga LLP (LLPIN: ADC-8749), Bengaluru, India. Trailwatch is an independent product and
          isn’t affiliated with or endorsed by Shopify.
        </div>
      </div>

      {/* Full-bleed hills strip, flush to the bottom on every device. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.hills} src="/FooterHiils.webp" alt="" aria-hidden="true" />
    </footer>
  );
}
