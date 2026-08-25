import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import styles from "./legal.module.css";

// Wraps the legal document pages in a single readable column with the shared
// site logo masthead and footer. Route group only — does not affect the
// /terms, /privacy, /refunds URLs.
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <Link href="/" aria-label="TrailWatch home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.logo} src="/logo.svg" alt="TrailWatch" />
        </Link>
      </header>
      <main className={styles.doc}>{children}</main>
      <SiteFooter />
    </div>
  );
}
