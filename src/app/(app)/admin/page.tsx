import { notFound } from "next/navigation";
import { getAccount } from "@/features/account/queries";
import { getMonthlyReport, isAdminEmail, listAdminUsers, listPreviewDays, monthRange, type PreviewDay } from "@/features/usage/report";
import { changeFounderCalls, setFoundingMember } from "@/features/beta/adminActions";
import { BETA_CONFIG } from "@/features/beta/config";
import { getBetaReport, type BetaReport } from "@/features/beta/report";
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
  let previews: PreviewDay[] | null = null;
  let beta: BetaReport | null = null;
  try {
    const service = createServiceClient();
    [report, users, previews] = await Promise.all([getMonthlyReport(service, month), listAdminUsers(service), listPreviewDays(service)]);
    // Separate so the cost view still loads before migration 0025.
    beta = await getBetaReport(service).catch(() => null);
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
              <th>Role</th>
              <th>Their store</th>
              <th>Verified brand</th>
              <th className={styles.num}>Signed up</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.email}>
                <td className={styles.mono}>{u.email}</td>
                <td>{u.role ?? ""}</td>
                <td className={styles.mono}>{u.ownStore ?? "—"}</td>
                <td>{u.verified ? "Yes — email matches store" : ""}</td>
                <td className={styles.num}>{u.signedUp.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className={styles.section}>Beta</h2>
      {beta ? (
        <>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Founding spots</div>
              <div className={styles.statValue}>
                {beta.foundingUsed} / {beta.foundingCap}
              </div>
            </div>
            {beta.ratings.map((r) => (
              <div key={r.target} className={styles.stat}>
                <div className={styles.statLabel}>{r.target === "briefing" ? "Briefings rated useful" : "Alerts rated useful"}</div>
                <div className={styles.statValue}>
                  {r.useful + r.notUseful ? `${Math.round((r.useful / (r.useful + r.notUseful)) * 100)}%` : "—"}
                  <span className={styles.statNote}> of {r.useful + r.notUseful}</span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.card}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Founding member</th>
                  <th className={styles.num}>Calls done</th>
                  <th className={styles.num}>Discount</th>
                </tr>
              </thead>
              <tbody>
                {beta.members.map((m) => (
                  <tr key={m.id}>
                    <td className={styles.mono}>{m.email}</td>
                    <td>
                      <form action={setFoundingMember} className={styles.inline}>
                        <input type="hidden" name="userId" value={m.id} />
                        <input type="hidden" name="founding" value={m.founding ? "false" : "true"} />
                        {m.founding ? "Yes" : "No"}{" "}
                        <button type="submit" className={styles.mini}>
                          {m.founding ? "Remove" : "Make founding"}
                        </button>
                      </form>
                    </td>
                    <td className={styles.num}>
                      {m.founding ? (
                        <span className={styles.inline}>
                          <form action={changeFounderCalls}>
                            <input type="hidden" name="userId" value={m.id} />
                            <input type="hidden" name="delta" value="-1" />
                            <button type="submit" className={styles.mini} aria-label={`One call fewer for ${m.email}`} disabled={m.calls === 0}>
                              −
                            </button>
                          </form>
                          {m.calls} / {BETA_CONFIG.callsNeeded}
                          <form action={changeFounderCalls}>
                            <input type="hidden" name="userId" value={m.id} />
                            <input type="hidden" name="delta" value="1" />
                            <button type="submit" className={styles.mini} aria-label={`One more call for ${m.email}`}>
                              +
                            </button>
                          </form>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={styles.num}>{m.founding ? `${m.discountPct}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className={styles.section}>Feedback and rating notes</h2>
          <div className={styles.card}>
            {beta.notes.length ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>What</th>
                    <th>From</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {beta.notes.map((n, i) => (
                    <tr key={i}>
                      <td className={styles.mono}>{n.at.slice(0, 10)}</td>
                      <td>{n.kind}</td>
                      <td className={styles.mono}>{n.email}</td>
                      <td className={styles.message}>{n.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className={styles.empty}>No feedback yet.</p>
            )}
          </div>
        </>
      ) : (
        <p className={styles.sub}>Beta data isn&rsquo;t available. Is migration 0025 applied?</p>
      )}

      <h2 className={styles.section}>Competitor previews (homepage, last 14 days)</h2>
      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Day (UTC)</th>
              <th className={styles.num}>Lookups</th>
              <th className={styles.num}>From cache</th>
              <th className={styles.num}>Fresh reads</th>
              <th className={styles.num}>Products fetched</th>
              <th className={styles.num}>Avg time</th>
            </tr>
          </thead>
          <tbody>
            {!previews || previews.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  {previews ? "No lookups yet." : "Apply migration 0020 to log previews."}
                </td>
              </tr>
            ) : (
              previews.map((d) => (
                <tr key={d.day}>
                  <td className={styles.mono}>{d.day}</td>
                  <td className={styles.num}>{d.lookups}</td>
                  <td className={styles.num}>{d.cached}</td>
                  <td className={styles.num}>{d.fresh}</td>
                  <td className={styles.num}>{d.products.toLocaleString("en-US")}</td>
                  <td className={styles.num}>{d.avgMs === null ? "—" : `${(d.avgMs / 1000).toFixed(1)}s`}</td>
                </tr>
              ))
            )}
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
