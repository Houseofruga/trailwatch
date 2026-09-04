"use client";

import { useState, type ReactNode } from "react";
import { UpgradeButton } from "./UpgradeButton";
import { formatProPrice, PRO_ANNUAL_USD, type BillingPeriod } from "@/features/plan/limits";
import styles from "./ProPricingCard.module.css";

// The Pro card, with a Monthly/Annual toggle in its head (right of "Pro") that
// drives the price line + badge below. Owns the toggle state so both the
// displayed price and the price ID sent to Paddle Checkout (via UpgradeButton)
// always agree. Annual is the default, per the pricing decision — it's the
// better deal and what we want most free users to land on.
//
// `features` comes from the caller (derived from LIMITS.paid, same as the
// Free card) rather than being hardcoded here, so plan limits stay defined
// in one place.
//
// `renderButton` lets a caller swap the checkout action for the currently
// selected period while sharing this card's whole presentation (toggle, badge,
// price, bullets) — the billing page uses the default UpgradeButton; onboarding
// passes its own button (it seeds competitors after payment). This is the single
// source of truth for the Pro card, so the two can't drift apart.
export function ProPricingCard({
  email,
  userId,
  features,
  renderButton,
}: {
  email: string;
  userId: string;
  features: string[];
  renderButton?: (period: BillingPeriod) => ReactNode;
}) {
  const [period, setPeriod] = useState<BillingPeriod>("annual");
  const price = formatProPrice(period);

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.planName}>Pro</div>
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
        <div className={styles.taxNote}>Plus applicable taxes &mdash; calculated at checkout</div>
      </div>

      <ul className={styles.features}>
        {features.map((f) => (
          <li key={f} className={styles.feature}>
            {f}
          </li>
        ))}
      </ul>

      <div className={styles.action}>
        {renderButton ? (
          renderButton(period)
        ) : (
          <UpgradeButton email={email} userId={userId} period={period} />
        )}
        <div className={styles.checkoutNote}>Secure checkout by Paddle &middot; cancel any time</div>
      </div>
    </div>
  );
}
