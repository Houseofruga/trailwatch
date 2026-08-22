import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccount } from "@/features/account/queries";
import { PLAN_LABEL, PLAN_PRICE } from "@/features/plan/limits";
import { DisplayNameForm } from "@/features/account/DisplayNameForm";
import { PasswordForm } from "@/features/account/PasswordForm";
import { DigestToggle } from "@/features/account/DigestToggle";
import { DeleteAccount } from "@/features/account/DeleteAccount";
import { UpgradeButton } from "@/features/billing/UpgradeButton";
import { CancelButton } from "@/features/billing/CancelButton";
import styles from "./page.module.css";

export default async function SettingsPage() {
  const account = await getAccount();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!account || !user) redirect("/login");

  const isFree = account.plan === "free";

  // Distinguish a real Paddle subscription from a comp (founder) Pro account.
  let hasSubscription = false;
  if (!isFree) {
    const { data: profile } = await supabase
      .from("users")
      .select("paddle_subscription_id")
      .eq("id", user.id)
      .single();
    hasSubscription = Boolean(profile?.paddle_subscription_id);
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.heading}>Settings</h1>
      <p className={styles.sub}>Manage your account, plan, digest, and sign-in.</p>

      {/* Plan */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Plan</h2>
        <p className={styles.sectionDesc}>
          You&rsquo;re on the {PLAN_LABEL[account.plan]} plan
          {isFree ? "." : ` (${PLAN_PRICE.paid}).`}
        </p>
        {isFree ? (
          <UpgradeButton email={account.email} userId={user.id} />
        ) : hasSubscription ? (
          <CancelButton />
        ) : (
          <div className={styles.readonly}>Complimentary Pro — no billing on this account.</div>
        )}
      </section>

      {/* Profile */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Display name</h2>
        <p className={styles.sectionDesc}>The name shown in the app.</p>
        <DisplayNameForm initial={account.displayName} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Email</h2>
        <p className={styles.sectionDesc}>The address your account and digest are tied to.</p>
        <div className={styles.readonly}>{account.email}</div>
        <div className={styles.readonlyNote}>
          To change your email, contact support — email changes need re-verification.
        </div>
      </section>

      {/* Security */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Password</h2>
        <p className={styles.sectionDesc}>
          Set or change your password. If you sign in with Google, adding one also lets you log in
          with email.
        </p>
        <PasswordForm />
      </section>

      {/* Digest */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Weekly digest</h2>
        <p className={styles.sectionDesc}>
          We email a summary of meaningful changes every Monday. Pause it any time.
        </p>
        <DigestToggle enabled={account.digestEnabled} />
      </section>

      {/* Danger zone */}
      <section className={styles.sectionDanger}>
        <h2 className={styles.sectionTitle}>Delete account</h2>
        <p className={styles.sectionDesc}>
          Permanently deletes your account and all competitors, pages, and change history. This
          can&rsquo;t be undone.
        </p>
        <DeleteAccount />
      </section>
    </div>
  );
}
