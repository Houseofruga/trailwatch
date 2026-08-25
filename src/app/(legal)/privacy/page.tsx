import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy — TrailWatch",
  description:
    "How TrailWatch, by House of Ruga, collects, uses, and protects your data.",
};

const SECTIONS = [
  "1. Data We Collect",
  "2. How We Use It",
  "3. Your Rights",
  "4. Cookies",
  "5. Contact",
];

export default function PrivacyPage() {
  return (
    <>
      <BackLink href="/">Back to home</BackLink>

      <h1 className={styles.title}>Privacy Policy</h1>
      <p className={styles.updated}>Last updated: August 25, 2026</p>

      <p className={styles.note}>
        This is placeholder content. The full Privacy Policy will be added here
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
