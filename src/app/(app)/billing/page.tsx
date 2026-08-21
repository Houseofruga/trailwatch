import { createClient } from "@/lib/supabase/server";
import { getAccount } from "@/features/account/queries";
import { LIMITS, PLAN_LABEL, PLAN_PRICE } from "@/features/plan/limits";
import { UpgradeButton } from "@/features/billing/UpgradeButton";
import { CancelButton } from "@/features/billing/CancelButton";
import styles from "./page.module.css";

const PRO_PERKS = [
  `Track up to ${LIMITS.paid.competitors} competitors`,
  `Up to ${LIMITS.paid.pagesPerCompetitor} pages per competitor`,
  "Daily checks with AI change summaries",
  "Weekly digest email",
];

export default async function BillingPage() {
  const account = await getAccount();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!account || !user) return null;

  const isFree = account.plan === "free";

  return (
    <div className={styles.wrap}>
      <h1 className={styles.heading}>Plan &amp; billing</h1>
      <p className={styles.sub}>Payments are handled securely by Paddle.</p>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <div className={styles.planLabel}>Current plan</div>
            <div className={styles.planName}>{PLAN_LABEL[account.plan]}</div>
          </div>
          <div className={styles.planPrice}>{PLAN_PRICE[account.plan]}</div>
        </div>

        <ul className={styles.perks}>
          {PRO_PERKS.map((perk) => (
            <li key={perk} className={styles.perk}>
              {perk}
            </li>
          ))}
        </ul>

        <div className={styles.action}>
          {isFree ? (
            <UpgradeButton email={account.email} userId={user.id} />
          ) : (
            <CancelButton />
          )}
        </div>
      </section>
    </div>
  );
}
