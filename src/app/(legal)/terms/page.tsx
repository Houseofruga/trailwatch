import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Terms of Service — TrailWatch",
  description:
    "The terms governing your use of TrailWatch, the competitor-tracking service by House of Ruga.",
};

const SECTIONS = [
  "1. Introduction",
  "2. Use of Service",
  "3. Payments & Cancellation",
  "4. Limitation of Liability",
  "5. Contact",
];

export default function TermsPage() {
  return (
    <>
      <BackLink href="/">Back to home</BackLink>

      <h1 className={styles.title}>Terms of Service</h1>
      <p className={styles.updated}>Last updated: August 25, 2026</p>

      <p className={styles.note}>
        This is placeholder content. The full Terms of Service will be added here
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
