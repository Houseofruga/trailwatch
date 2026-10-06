import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/components/breadcrumbJsonLd";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Trailwatch's billing, cancellation, and refund terms, by House of Ruga LLP.",
  alternates: { canonical: "/refunds" },
};

const CONTACT = "trailwatch@houseofruga.com";

export default function RefundsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Refund Policy", path: "/refunds" },
        ])}
      />
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className={styles.sep} aria-hidden="true">
          ›
        </span>
        <span>Legal</span>
        <span className={styles.sep} aria-hidden="true">
          ›
        </span>
        <span className={styles.current}>Refund Policy</span>
      </nav>

      <h1 className={styles.title}>Refund Policy</h1>
      <p className={styles.updated}>Last updated: October 6, 2026</p>

      <p className={styles.lead}>
        Trailwatch is free during the beta: there is nothing to pay and nothing to refund.
        This policy explains how billing, cancellations, and refunds will work once paid
        plans launch. We will tell you before that happens and will never charge you
        without your agreement.
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. Billing &amp; merchant of record</h2>
        <p className={styles.para}>
          Paid subscriptions are sold and processed by Paddle, which acts as the merchant
          of record for your purchase. This means Paddle handles payment, invoicing, and
          applicable taxes, and its{" "}
          <a
            className={styles.link}
            href="https://www.paddle.com/legal/checkout-buyer-terms"
            target="_blank"
            rel="noopener noreferrer"
          >
            buyer terms
          </a>{" "}
          also apply to your transaction. Paid plans will be billed in advance each
          month, in USD, and renew automatically until you cancel.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. Cancellation</h2>
        <p className={styles.para}>
          You will be able to cancel a paid plan at any time from your settings. When you
          cancel, you keep your plan&rsquo;s features until the end of the period you have
          already paid for, and you are not charged again. After that, your account moves
          to the free plan and its limits. We do not charge a cancellation fee.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. Refunds</h2>
        <p className={styles.para}>
          Because you can try Trailwatch for free before paying, subscription fees
          are generally non-refundable for time already elapsed. That said, we deal with
          refund requests in good faith:
        </p>
        <ul className={styles.list}>
          <li>
            If something on our side stops the service from working and we can&rsquo;t put
            it right, contact us and we&rsquo;ll sort out a fair refund.
          </li>
          <li>
            Accidental or duplicate charges, and charges immediately after an unintended
            renewal, will be refunded — just reach out promptly.
          </li>
        </ul>
        <p className={styles.para}>
          Any refund we agree to is issued through Paddle back to your original payment
          method. Nothing in this policy affects the statutory refund or consumer rights
          you may have where you live.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. How to request a refund</h2>
        <p className={styles.para}>
          Email us at{" "}
          <a className={styles.link} href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>{" "}
          from the address on your account, with the date of the charge and a short note
          about what happened. We aim to reply within a few business days.
        </p>
      </section>
    </>
  );
}
