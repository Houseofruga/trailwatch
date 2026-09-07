import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { getAccount } from "@/features/account/queries";
import styles from "./layout.module.css";

export default async function AppLayout({
  children,
  modal,
}: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) {
  const account = await getAccount();

  // src/proxy.ts already guards these routes; this is the belt to its braces,
  // and it narrows `account` for the sidebar.
  if (!account) redirect("/login");

  return (
    <div className={styles.shell}>
      <Sidebar account={account} />
      <main className={styles.main}>{children}</main>
      {/* Intercepting-route overlay (e.g. change detail); position:fixed, so it
          renders above the shell regardless of DOM order. */}
      {modal}
    </div>
  );
}
