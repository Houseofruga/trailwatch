import { notFound } from "next/navigation";
import { getAccount } from "@/features/account/queries";
import { getMonthlyReport, isAdminEmail, listAdminUsers, monthRange } from "@/features/usage/report";
import { createServiceClient } from "@/lib/supabase/service";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

// Internal cost view (SPEC.md §5 Phase 7): AI cost per user per month and
// crawl volume per store. Visible only to ADMIN_EMAILS — anyone else gets a 404,
// so the route doesn't even reveal it exists. Built from existing tokens and
// the settings page's patterns; it's an internal tool, not a customer screen.

const usd = (n: number) => `$${n < 0.01 && n > 0 ? n.toFixed(4) : n.toFixed(2)}`;

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const account = await getAccount();
  if (!account || !isAdminEmail(account.email)) notFound();

  const { month: requested } = await searchParams;
  const { month } = monthRange(requested);

  let report;
  let users;
  try {
    const service = createServiceClient();
    [report, users] = await Promise.all([getMonthlyReport(service, month), listAdminUsers(service)]);
  } catch (err) {
    return (
      <div className={styles.wrap}>
        <h1 className={styles.heading}>Costs</h1>
        <p className={styles.sub}>
          Couldn&rsquo;t load usage ({err instanceof Error ? err.message : "unknown error"}). Is migration 0015 applied?
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.heading}>Costs</h1>
      <p className={styles.sub}>
        <a href={`/admin?month=${shiftMonth(month, -1)}`}>&larr;</a> {month}{" "}
        <a href={`/admin?month=${shiftMonth(month, 1)}`}>&rarr;</a> · AI at list prices (Groq&rsquo;s free tier
        actually costs $0) · store work split across its followers
      </p>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>AI cost</div>
          <div className={styles.statValue}>{usd(report.totalCost)}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>AI calls</div>
          <div className={styles.statValue}>{report.aiCalls}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Unallocated</div>
          <div className={styles.statValue}>{usd(report.unallocated)}</div>
        </div>
      </div>

      <h2 className={styles.section}>Cost per user</h2>
      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>User</th>
              <th>Plan</th>
              <th className={styles.num}>Competitors</th>
              <th className={styles.num}>Own (briefing)</th>
              <th className={styles.num}>Shared (stores)</th>
              <th className={styles.num}>Total</th>
            </tr>
          </thead>
          <tbody>
            {report.users.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.empty}>No AI usage this month.</td>
              </tr>
            ) : (
              report.users.map((u) => (
                <tr key={u.userId}>
                  <td className={styles.mono}>{u.email}</td>
                  <td>{u.plan}</td>
                  <td className={styles.num}>{u.competitors}</td>
                  <td className={styles.num}>{usd(u.direct)}</td>
                  <td className={styles.num}>{usd(u.shared)}</td>
                  <td className={styles.num}>{usd(u.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className={styles.section}>Users</h2>
      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>User</th>
              <th>Their store</th>
              <th>Verified brand</th>
              <th className={styles.num}>Signed up</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.email}>
                <td className={styles.mono}>{u.email}</td>
                <td className={styles.mono}>{u.ownStore ?? "—"}</td>
                <td>{u.verified ? "Yes — email matches store" : ""}</td>
                <td className={styles.num}>{u.signedUp.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className={styles.section}>Stores</h2>
      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Store</th>
              <th className={styles.num}>Followers</th>
              <th className={styles.num}>AI calls</th>
              <th className={styles.num}>AI cost</th>
              <th className={styles.num}>Requests</th>
            </tr>
          </thead>
          <tbody>
            {report.stores.length === 0 ? (
              <tr>
                <td colSpan={5} className={styles.empty}>No stores yet.</td>
              </tr>
            ) : (
              report.stores.map((s) => (
                <tr key={s.storeId}>
                  <td className={styles.mono}>{s.domain}</td>
                  <td className={styles.num}>{s.followers}</td>
                  <td className={styles.num}>{s.aiCalls}</td>
                  <td className={styles.num}>{usd(s.cost)}</td>
                  <td className={styles.num}>{s.requests}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
