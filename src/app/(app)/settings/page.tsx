import { redirect } from "next/navigation";
import { getAccount } from "@/features/account/queries";
import { DisplayNameForm } from "@/features/account/DisplayNameForm";
import { PasswordForm } from "@/features/account/PasswordForm";
import { DigestToggle } from "@/features/account/DigestToggle";
import { DeleteAccount } from "@/features/account/DeleteAccount";
import styles from "./page.module.css";

export default async function SettingsPage() {
  const account = await getAccount();
  if (!account) redirect("/login");

  return (
    <div className={styles.wrap}>
      <h1 className={styles.heading}>Settings</h1>
      <p className={styles.sub}>Manage your account, digest, and sign-in.</p>

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
