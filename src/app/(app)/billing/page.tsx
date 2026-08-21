import { createClient } from "@/lib/supabase/server";
import { getAccount } from "@/features/account/queries";
import { getNextChargeDate } from "@/features/billing/queries";
import { LIMITS, PLAN_PRICE } from "@/features/plan/limits";
import { UpgradeButton } from "@/features/billing/UpgradeButton";
import { CancelButton } from "@/features/billing/CancelButton";
import { ManageBillingButton } from "@/features/billing/ManageBillingButton";
import styles from "./page.module.css";

function planFeatures(comp: number, pages: number): string[] {
  return [
    `${comp} competitor${comp === 1 ? "" : "s"}`,
    comp === 1 ? `${pages} pages on that competitor` : `${pages} pages per competitor`,
    "Daily checks, noise filtered",
    "Weekly email digest",
  ];
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default async function BillingPage() {
  const account = await getAccount();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!account || !user) return null;

  const isFree = account.plan === "free";

  // Only paid users have a subscription to show a next-charge date for.
  let nextCharge: string | null = null;
  if (!isFree) {
    const { data: profile } = await supabase
      .from("users")
      .select("paddle_subscription_id")
      .eq("id", user.id)
      .single();
    if (profile?.paddle_subscription_id) {
      nextCharge = await getNextChargeDate(profile.paddle_subscription_id);
    }
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.heading}>Plan &amp; billing</h1>
      <p className={styles.sub}>
        {isFree
          ? "You’re on Free. Pro is the only paid plan — no tiers, no add-ons."
          : "You’re on Pro, billed monthly. Cancel any time."}
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

        {/* Pro */}
        <div className={`${styles.card} ${styles.cardPro}`}>
          <div className={styles.cardHead}>
            <div className={styles.planName}>Pro</div>
            {!isFree ? <span className={styles.current}>Current</span> : null}
          </div>
          <div className={styles.price}>
            <span className={styles.priceAmount}>$19</span>
            <span className={styles.pricePer}>/month</span>
          </div>
          <ul className={styles.features}>
            {planFeatures(LIMITS.paid.competitors, LIMITS.paid.pagesPerCompetitor).map((f) => (
              <li key={f} className={styles.feature}>
                {f}
              </li>
            ))}
          </ul>

          {isFree ? (
            <div className={styles.action}>
              <UpgradeButton email={account.email} userId={user.id} />
              <div className={styles.checkoutNote}>Secure checkout by Paddle · cancel any time</div>
            </div>
          ) : (
            <div className={styles.action}>
              <CancelButton />
            </div>
          )}
        </div>
      </div>

      {!isFree ? (
        <div className={styles.billingBox}>
          <div className={styles.billingLabel}>Billing</div>
          <div className={styles.billingRows}>
            <div className={styles.billingRow}>
              <span className={styles.billingKey}>Next charge</span>
              <span>
                {nextCharge ? `${PLAN_PRICE.paid.replace("/mo", "")}.00 on ${formatDate(nextCharge)}` : "—"}
              </span>
            </div>
            <div className={styles.billingRow}>
              <span className={styles.billingKey}>Billed</span>
              <span>Monthly, in USD</span>
            </div>
            <div className={styles.billingRow}>
              <span className={styles.billingKey}>Invoices</span>
              <ManageBillingButton />
            </div>
          </div>
        </div>
      ) : null}

      <p className={styles.footNote}>
        One paid plan, no add-ons, no annual lock-in. If you cancel you keep your first competitor
        and three pages on Free.
      </p>
    </div>
  );
}
