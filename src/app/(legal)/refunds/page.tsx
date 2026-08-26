import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Refund Policy — TrailWatch",
  description:
    "TrailWatch's billing, cancellation, and refund terms, by House of Ruga LLP.",
};

const CONTACT = "trailwatch@houseofruga.com";

export default function RefundsPage() {
  return (
    <>
      <BackLink href="/">Back to home</BackLink>

      <h1 className={styles.title}>Refund Policy</h1>
      <p className={styles.updated}>Last updated: August 26, 2026</p>

      <p className={styles.lead}>
        We want the pricing to feel as honest as the product. TrailWatch has a free plan
        so you can evaluate it before you ever pay, and you can cancel a paid plan at any
        time. This policy explains how billing, cancellations, and refunds work.
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
          also apply to your transaction. The Pro plan is billed in advance on a monthly
          or annual cycle, in USD, and renews automatically until you cancel.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. Cancellation</h2>
        <p className={styles.para}>
          You can cancel your Pro subscription at any time from your billing settings.
          When you cancel, you keep Pro access until the end of the period you have
          already paid for, and you are not charged again. After that, your account
          returns to the free plan and its limits. We do not charge a cancellation fee.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. Refunds</h2>
        <p className={styles.para}>
          Because the free plan lets you try TrailWatch before paying, subscription fees
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
          <li>
            Annual fees are non-refundable and not pro-rated on early cancellation,
            though you keep Pro access until the end of the year you have paid for. We
            still consider good-faith exceptions case by case.
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
