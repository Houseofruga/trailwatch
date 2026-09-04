"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { Button } from "@/components/Button";
import { seedCompetitors, currentPlan } from "@/features/competitors/actions";
import {
  LIMITS,
  formatProPrice,
  PRO_ANNUAL_USD,
  type BillingPeriod,
} from "@/features/plan/limits";
import styles from "./welcome.module.css";

const KEY = "tw_pending_competitors";

// One env var per Pro price (Paddle dashboard) — same as billing's UpgradeButton.
const PRICE_ID_BY_PERIOD: Record<BillingPeriod, string | undefined> = {
  monthly: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY,
  annual: process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO_ANNUAL,
};

type SeedRow = { name: string; url: string };

function features(kind: "free" | "paid"): string[] {
  const l = LIMITS[kind];
  return [
    `${l.competitors} competitors`,
    `${l.pagesPerCompetitor} pages per competitor`,
    "Daily checks, noise filtered",
    "Weekly email digest",
    "AI summaries included",
  ];
}

/**
 * Step 2 of onboarding: choose a plan. Free continues with the competitors picked
 * on step 1; Pro opens Paddle checkout, then (on success) polls until the plan
 * flips to paid, seeds ALL competitors, and goes to the dashboard.
 */
export function OnboardingPlanStep({
  allRows,
  email,
  userId,
  busy,
  onBack,
  onContinueFree,
}: {
  allRows: SeedRow[];
  email: string;
  userId: string;
  busy: boolean;
  onBack: () => void;
  onContinueFree: () => void;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<BillingPeriod>("annual");
  const [paddle, setPaddle] = useState<Paddle>();
  const [finalizing, setFinalizing] = useState(false);
  const [slow, setSlow] = useState(false);

  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const environment =
    process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";
  const priceId = PRICE_ID_BY_PERIOD[period];
  const price = formatProPrice(period);
  const configured = Boolean(token && priceId);

  useEffect(() => {
    if (!token) return;
    initializePaddle({
      environment,
      token,
      eventCallback: (event) => {
        if (event?.name === "checkout.completed") setFinalizing(true);
      },
    }).then((instance) => {
      if (instance) setPaddle(instance);
    });
  }, [token, environment]);

  // Payment done: poll until the webhook flips the plan to paid, then seed all
  // competitors and go to the dashboard. If it's slow, keep the picks and bounce
  // to the dashboard — its PendingSeedRedirect returns them here (now Pro).
  useEffect(() => {
    if (!finalizing) return;
    paddle?.Checkout.close();
    let cancelled = false;
    let tries = 0;

    const tick = async () => {
      tries += 1;
      let plan: "free" | "paid" = "free";
      try {
        plan = await currentPlan();
      } catch {
        /* transient — try again */
      }
      if (cancelled) return;

      if (plan === "paid") {
        try {
          await seedCompetitors(allRows);
          localStorage.removeItem(KEY);
        } catch {
          /* seed best-effort; dashboard redirect covers the rest */
        }
        const n = allRows.length;
        router.push(
          `/dashboard?flash=${encodeURIComponent(
            `Welcome to Pro — added ${n} competitor${n !== 1 ? "s" : ""}, baselines captured.`,
          )}`,
        );
        return;
      }

      if (tries >= 10) {
        setSlow(true);
        router.push("/dashboard");
        return;
      }
      setTimeout(tick, 2000);
    };

    const id = setTimeout(tick, 1500);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [finalizing, paddle, allRows, router]);

  function openCheckout() {
    if (!paddle || !priceId) return;
    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email },
      customData: { userId },
      settings: { displayMode: "overlay", theme: "light" },
    });
  }

  if (finalizing) {
    return (
      <div className={styles.plansWrap}>
        <p className={styles.finalizing}>
          Finalizing your upgrade — setting up all {allRows.length} competitors…
        </p>
        {slow && (
          <p className={styles.sub}>
            Payment received. If this doesn’t finish in a moment, head to your dashboard.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.plansWrap}>
      <button type="button" className={styles.back} onClick={onBack} disabled={busy}>
        ← Back
      </button>
      <h1 className={styles.title}>Choose your plan</h1>
      <p className={styles.sub}>
        Free tracks {LIMITS.free.competitors} competitors. Go Pro to watch all{" "}
        {allRows.length}.
      </p>

      <div className={styles.planGrid}>
        {/* Free */}
        <div className={styles.planCard}>
          <div className={styles.planHeadRow}>
            <div className={styles.planName}>Free</div>
          </div>
          <div className={styles.priceBlock}>
            <div className={styles.planPrice}>$0</div>
          </div>
          <ul className={styles.planFeatures}>
            {features("free").map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <div className={styles.action}>
            <Button type="button" variant="secondary" full onClick={onContinueFree} disabled={busy}>
              {busy ? "Setting up…" : "Continue with Free plan"}
            </Button>
          </div>
        </div>

        {/* Pro */}
        <div className={`${styles.planCard} ${styles.planCardPro}`}>
          <div className={styles.planHeadRow}>
            <div className={styles.planName}>Pro</div>
            <div className={styles.toggle} role="group" aria-label="Billing period">
              <button
                type="button"
                className={period === "monthly" ? styles.toggleActive : styles.toggleOpt}
                aria-pressed={period === "monthly"}
                onClick={() => setPeriod("monthly")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={period === "annual" ? styles.toggleActive : styles.toggleOpt}
                aria-pressed={period === "annual"}
                onClick={() => setPeriod("annual")}
              >
                Annual
                <span className={styles.bestValue}>Best value</span>
              </button>
            </div>
          </div>
          <div className={styles.priceBlock}>
            <div className={styles.planPrice}>
              <span className={styles.priceAmount}>{price.amount}</span>
              <span className={styles.planPer}>{price.per}</span>
            </div>
            {period === "annual" && (
              <div className={styles.savings}>
                ${PRO_ANNUAL_USD} billed annually · <span className={styles.badge}>2 months free</span>
              </div>
            )}
          </div>
          <ul className={styles.planFeatures}>
            {features("paid").map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <div className={styles.action}>
            <Button
              type="button"
              full
              onClick={openCheckout}
              disabled={!configured || !paddle || busy}
            >
              {configured ? "Upgrade to Pro" : "Upgrade unavailable"}
            </Button>
            <div className={styles.checkoutNote}>Secure checkout by Paddle · cancel any time</div>
          </div>
        </div>
      </div>
    </div>
  );
}
