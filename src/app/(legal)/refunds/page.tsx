import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Refund Policy — TrailWatch",
  description:
    "TrailWatch's billing, cancellation, and refund terms, by House of Ruga.",
};

const SECTIONS = [
  "1. Billing",
  "2. Cancellations",
  "3. Refund Eligibility",
  "4. Contact",
];

export default function RefundsPage() {
  return (
    <>
      <BackLink href="/">Back to home</BackLink>

      <h1 className={styles.title}>Refund Policy</h1>
      <p className={styles.updated}>Last updated: August 25, 2026</p>

      <p className={styles.note}>
        This is placeholder content. The full Refund Policy will be added here
        before launch.
      </p>

      {SECTIONS.map((title) => (
        <section key={title} className={styles.section}>
          <h2 className={styles.sectionTitle}>{title}</h2>
        </section>
      ))}
    </>
  );
}
