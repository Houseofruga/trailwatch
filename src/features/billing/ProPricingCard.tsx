"use client";

import { useState } from "react";
import { UpgradeButton } from "./UpgradeButton";
import { formatProPrice, PRO_ANNUAL_USD, type BillingPeriod } from "@/features/plan/limits";
import styles from "./ProPricingCard.module.css";

// The Monthly/Annual toggle that sits above the Pro card, plus the price line
// and badge that change with it. Owns the toggle state so both the displayed
// price and the price ID sent to Paddle Checkout (via UpgradeButton) always
// agree. Annual is the default, per the pricing decision — it's the better
// deal and what we want most free users to land on.
//
// `features` comes from the caller (derived from LIMITS.paid, same as the
// Free card) rather than being hardcoded here, so plan limits stay defined
// in one place.
export function ProPricingCard({
  email,
  userId,
  features,
}: {
  email: string;
  userId: string;
  features: string[];
}) {
  const [period, setPeriod] = useState<BillingPeriod>("annual");
  const price = formatProPrice(period);

  return (
    <>
      <div className={styles.toggle} role="group" aria-label="Billing period">
        <button
          type="button"
          className={period === "monthly" ? styles.optionActive : styles.option}
          aria-pressed={period === "monthly"}
          onClick={() => setPeriod("monthly")}
        >
          Monthly
        </button>
        <button
          type="button"
          className={period === "annual" ? styles.optionActive : styles.option}
          aria-pressed={period === "annual"}
          onClick={() => setPeriod("annual")}
        >
          Annual
          <span className={styles.bestValue}>Best value</span>
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div className={styles.planName}>Pro</div>
        </div>
        <div className={styles.priceBlock}>
          <div className={styles.price}>
            <span className={styles.priceAmount}>{price.amount}</span>
            <span className={styles.pricePer}>{price.per}</span>
          </div>
          {period === "annual" ? (
            <div className={styles.savings}>
              ${PRO_ANNUAL_USD} billed annually &middot; <span className={styles.badge}>2 months free</span>
            </div>
          ) : null}
        </div>

        <ul className={styles.features}>
          {features.map((f) => (
            <li key={f} className={styles.feature}>
              {f}
            </li>
          ))}
        </ul>

        <div className={styles.action}>
          <UpgradeButton email={email} userId={userId} period={period} />
          <div className={styles.checkoutNote}>Secure checkout by Paddle &middot; cancel any time</div>
        </div>
      </div>
    </>
  );
}
