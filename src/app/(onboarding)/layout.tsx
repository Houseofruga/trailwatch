import { redirect } from "next/navigation";
import { getAccount } from "@/features/account/queries";
import { logOut } from "@/features/auth/actions";
import styles from "./layout.module.css";

// Focused onboarding chrome — no app sidebar. A top bar mirroring the public
// header (TrailWatch mark left, signed-in profile + Log out right), with the
// flow centered below.
export default async function OnboardingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const account = await getAccount();
  if (!account) redirect("/login");

  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.logo} src="/logo.svg" alt="TrailWatch" />

        <div className={styles.profile}>
          <div className={styles.avatar} aria-hidden="true">
            {account.initials}
          </div>
          <div className={styles.who}>
            <div className={styles.name}>{account.displayName}</div>
            <div className={styles.email}>{account.email}</div>
          </div>
          <form action={logOut}>
            <button type="submit" className={styles.logout}>
              Log out
            </button>
          </form>
        </div>
      </header>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
