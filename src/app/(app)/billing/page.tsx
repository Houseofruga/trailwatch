import { createClient } from "@/lib/supabase/server";
import { getAccount } from "@/features/account/queries";
import { getSubscriptionBillingInfo } from "@/features/billing/queries";
import { LIMITS, PLAN_PRICE, PRO_MONTHLY_USD, PRO_ANNUAL_USD, formatProPrice } from "@/features/plan/limits";
import { ProPricingCard } from "@/features/billing/ProPricingCard";
import { CancelButton } from "@/features/billing/CancelButton";
import { ManageBillingButton } from "@/features/billing/ManageBillingButton";
import { formatBillingDate } from "@/features/billing/formatDate";
import styles from "./page.module.css";

function planFeatures(comp: number, pages: number): string[] {
  return [
    `${comp} competitor${comp === 1 ? "" : "s"}`,
    comp === 1 ? `${pages} pages on that competitor` : `${pages} pages per competitor`,
    "Daily checks, noise filtered",
    "Weekly email digest",
  ];
}

export default async function BillingPage() {
  const account = await getAccount();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!account || !user) return null;

  const isFree = account.plan === "free";

  // A paid user normally has a Paddle subscription — but a comp (founder) account
  // is Pro with none. Distinguish them so we don't show Cancel/Invoices for a
  // subscription that doesn't exist. For a real subscription, ask Paddle for
  // its actual interval so the price/billed lines reflect monthly vs annual
  // (we don't store the period ourselves — Paddle is the source of truth).
  let hasSubscription = false;
  let nextCharge: string | null = null;
  let period: "monthly" | "annual" = "monthly";
  let cancelsAt: string | null = null;
  if (!isFree) {
    const { data: profile } = await supabase
      .from("users")
      .select("paddle_subscription_id")
      .eq("id", user.id)
      .single();
    hasSubscription = Boolean(profile?.paddle_subscription_id);
    if (hasSubscription) {
      const billingInfo = await getSubscriptionBillingInfo(profile!.paddle_subscription_id!);
      nextCharge = billingInfo?.nextBilledAt ?? null;
      period = billingInfo?.period ?? "monthly";
      cancelsAt = billingInfo?.cancelsAt ?? null;
    }
  }

  const proPrice = formatProPrice(period);
  const renewalAmount = period === "annual" ? PRO_ANNUAL_USD : PRO_MONTHLY_USD;

  return (
    <div className={styles.wrap}>
      <h1 className={styles.heading}>Plan &amp; billing</h1>
      <p className={styles.sub}>
        {isFree
          ? "You’re on Free. Pro is the only paid plan — no tiers, no add-ons."
          : cancelsAt
            ? `Your Pro plan is cancelling — you’ll keep access until ${formatBillingDate(cancelsAt)}, then move to Free.`
            : `You’re on Pro, billed ${period}. Cancel any time.`}
      </p>

      <div className={styles.grid}>
        {/* Free */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <div className={styles.planName}>Free</div>
            {isFree ? <span className={styles.current}>Current</span> : null}
          </div>
          <div className={styles.price}>{PLAN_PRICE.free}</div>
          <ul className={styles.features}>
            {planFeatures(LIMITS.free.competitors, LIMITS.free.pagesPerCompetitor).map((f) => (
              <li key={f} className={styles.feature}>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro — the toggle + checkout card (not yet subscribed), or a plain
            summary card (already on Pro: nothing to toggle post-purchase). */}
        {isFree ? (
          <ProPricingCard
            email={account.email}
            userId={user.id}
            features={planFeatures(LIMITS.paid.competitors, LIMITS.paid.pagesPerCompetitor)}
          />
        ) : (
          <div className={`${styles.card} ${styles.cardPro}`}>
            <div className={styles.cardHead}>
              <div className={styles.planName}>Pro</div>
              <span className={styles.current}>Current</span>
            </div>
            <div className={styles.price}>
              <span className={styles.priceAmount}>{proPrice.amount}</span>
              <span className={styles.pricePer}>{proPrice.per}</span>
            </div>
            <ul className={styles.features}>
              {planFeatures(LIMITS.paid.competitors, LIMITS.paid.pagesPerCompetitor).map((f) => (
                <li key={f} className={styles.feature}>
                  {f}
                </li>
              ))}
            </ul>

            {hasSubscription && cancelsAt ? (
              <div className={styles.action}>
                <div className={styles.compNote}>
                  Cancels {formatBillingDate(cancelsAt)} — you keep Pro until then.
                </div>
              </div>
            ) : hasSubscription ? (
              <div className={styles.action}>
                <CancelButton />
              </div>
            ) : (
              <div className={styles.action}>
                <div className={styles.compNote}>Complimentary Pro — no billing on this account.</div>
              </div>
            )}
          </div>
        )}
      </div>

      {!isFree && hasSubscription ? (
        <div className={styles.billingBox}>
          <div className={styles.billingLabel}>Billing</div>
          <div className={styles.billingRows}>
            <div className={styles.billingRow}>
              <span className={styles.billingKey}>{cancelsAt ? "Cancels" : "Next charge"}</span>
              <span>
                {cancelsAt
                  ? formatBillingDate(cancelsAt)
                  : nextCharge
                    ? `$${renewalAmount}.00 on ${formatBillingDate(nextCharge)}`
                    : "—"}
              </span>
            </div>
            <div className={styles.billingRow}>
              <span className={styles.billingKey}>Billed</span>
              <span>{period === "annual" ? "Annually" : "Monthly"}, in USD</span>
            </div>
            <div className={styles.billingRow}>
              <span className={styles.billingKey}>Invoices</span>
              <ManageBillingButton />
            </div>
          </div>
        </div>
      ) : null}

      <p className={styles.footNote}>
        One paid plan, no add-ons. Cancel any time — you keep Pro through the end of your current
        billing period; we don&rsquo;t prorate or refund unused time. If you cancel you keep your
        first competitor and three pages on Free.
      </p>
    </div>
  );
}
