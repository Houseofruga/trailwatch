import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import styles from "./legal.module.css";

// Wraps the legal document pages in a single readable column with the shared
// site header and footer. Route group only — does not affect the
// /terms, /privacy, /refunds URLs.
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className={styles.doc}>{children}</main>
      <SiteFooter />
    </div>
  );
}
