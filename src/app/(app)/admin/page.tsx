import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconChevronLeft, IconChevronRight, IconMinus, IconPlus } from "@/components/ui/icons";
import { IndexTable, type Row } from "@/components/ui/IndexTable";
import { PageBody, PageHeader } from "@/components/ui/Page";
import { getAccount } from "@/features/account/queries";
import { changeFounderCalls, setFoundingMember } from "@/features/beta/adminActions";
import { BETA_CONFIG } from "@/features/beta/config";
import { getBetaReport, type BetaReport } from "@/features/beta/report";
import { getMonthlyReport, isAdminEmail, listAdminUsers, listPreviewDays, monthRange, type PreviewDay } from "@/features/usage/report";
import { createServiceClient } from "@/lib/supabase/service";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Admin space" };
export const dynamic = "force-dynamic";

// Admin space: beta members and feedback, AI cost per user and store, users,
// homepage previews. Visible only to ADMIN_EMAILS; anyone else gets a 404, so
// the route doesn't reveal it exists. Built from the app's own components
// (internal tool; no artboard).

const usd = (n: number) => `$${n < 0.01 && n > 0 ? n.toFixed(4) : n.toFixed(2)}`;
const pct = (useful: number, total: number) => (total ? `${Math.round((useful / total) * 100)}%` : "—");

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}

const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card>
      <div className={styles.stat}>
        <span className={styles.statLabel}>{label}</span>
        <span className={styles.statValue}>{value}</span>
        {note ? <span className={styles.statNote}>{note}</span> : null}
      </div>
    </Card>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return <div className={styles.meta}>{children}</div>;
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const account = await getAccount();
  if (!account || !isAdminEmail(account.email)) notFound();

  const { month: requested } = await searchParams;
  const { month } = monthRange(requested);

  const service = createServiceClient();
  let loaded;
  try {
    loaded = await Promise.all([getMonthlyReport(service, month), listAdminUsers(service), listPreviewDays(service).catch(() => null)]);
  } catch (err) {
    return (
      <PageBody>
        <PageHeader title="Admin space" />
        <Banner tone="critical" title="Couldn’t load usage">
          {err instanceof Error ? err.message : "Unknown error"}. Is migration 0015 applied?
        </Banner>
      </PageBody>
    );
  }
  const [report, users, previews] = loaded as [Awaited<ReturnType<typeof getMonthlyReport>>, Awaited<ReturnType<typeof listAdminUsers>>, PreviewDay[] | null];
  // Separate so the rest still loads before migration 0025.
  const beta: BetaReport | null = await getBetaReport(service).catch(() => null);

  const monthNav = (
    <div className={styles.monthNav}>
      <Button variant="grey" iconOnly aria-label="Previous month" icon={<IconChevronLeft size={16} />} href={`/admin?month=${shiftMonth(month, -1)}`} />
      <span className={styles.month}>{monthLabel(month)}</span>
      <Button variant="grey" iconOnly aria-label="Next month" icon={<IconChevronRight size={16} />} href={`/admin?month=${shiftMonth(month, 1)}`} />
    </div>
  );

  // ------------------------------------------------------------- beta rows
  const memberRows: Row[] = (beta?.members ?? []).map((m) => {
    const founding = (
      <form action={setFoundingMember} className={styles.inline}>
        <input type="hidden" name="userId" value={m.id} />
        <input type="hidden" name="founding" value={m.founding ? "false" : "true"} />
        {m.founding ? <Badge tone="success">Beta member</Badge> : <span className={styles.muted}>No</span>}
        <Button type="submit" variant="plain">
          {m.founding ? "Remove" : "Make beta member"}
        </Button>
      </form>
    );
    const calls = m.founding ? (
      <span className={styles.inline}>
        <form action={changeFounderCalls}>
          <input type="hidden" name="userId" value={m.id} />
          <input type="hidden" name="delta" value="-1" />
          <Button type="submit" variant="grey" iconOnly icon={<IconMinus size={16} />} aria-label={`One call fewer for ${m.email}`} disabled={m.calls === 0} />
        </form>
        <span className={styles.num}>
          {m.calls} / {BETA_CONFIG.callsNeeded}
        </span>
        <form action={changeFounderCalls}>
          <input type="hidden" name="userId" value={m.id} />
          <input type="hidden" name="delta" value="1" />
          <Button type="submit" variant="grey" iconOnly icon={<IconPlus size={16} />} aria-label={`One more call for ${m.email}`} />
        </form>
      </span>
    ) : (
      <span className={styles.muted}>—</span>
    );
    const discount = m.founding ? `${m.discountPct}%` : "—";
    return {
      id: m.id,
      cells: [<span key="e" className={styles.email}>{m.email}</span>, founding, calls, discount],
      mobile: (
        <>
          <span className={styles.email}>{m.email}</span>
          <Meta>
            {founding}
            {m.founding ? (
              <>
                {calls}
                <span>{discount} off</span>
              </>
            ) : null}
          </Meta>
        </>
      ),
    };
  });

  const noteRows: Row[] = (beta?.notes ?? []).map((n, i) => ({
    id: `n${i}`,
    cells: [
      <span key="d" className={styles.muted}>{n.at.slice(0, 10)}</span>,
      <Badge key="k">{n.kind}</Badge>,
      <span key="e" className={styles.email}>{n.email}</span>,
      <span key="m" className={styles.message}>{n.message}</span>,
    ],
    mobile: (
      <>
        <span className={styles.message}>{n.message}</span>
        <Meta>
          <Badge>{n.kind}</Badge>
          <span>{n.email}</span>
          <span>{n.at.slice(0, 10)}</span>
        </Meta>
      </>
    ),
  }));

  // ------------------------------------------------------------- cost rows
  const costRows: Row[] = report.users.map((u) => ({
    id: u.userId,
    cells: [
      <span key="e" className={styles.email}>{u.email}</span>,
      <Badge key="p">{u.plan}</Badge>,
      u.competitors,
      usd(u.direct),
      usd(u.shared),
      <strong key="t">{usd(u.total)}</strong>,
    ],
    mobile: (
      <>
        <span className={styles.email}>{u.email}</span>
        <Meta>
          <strong>{usd(u.total)}</strong>
          <span>{u.competitors} competitors</span>
          <Badge>{u.plan}</Badge>
        </Meta>
      </>
    ),
  }));

  const userRows: Row[] = users.map((u) => ({
    id: u.email,
    cells: [
      <span key="e" className={styles.email}>{u.email}</span>,
      u.role ?? <span key="r" className={styles.muted}>—</span>,
      u.ownStore ?? <span key="s" className={styles.muted}>—</span>,
      u.verified ? <Badge key="v" tone="info">Email matches store</Badge> : "",
      <span key="d" className={styles.muted}>{u.signedUp.slice(0, 10)}</span>,
    ],
    mobile: (
      <>
        <span className={styles.email}>{u.email}</span>
        <Meta>
          {u.ownStore ? <span>{u.ownStore}</span> : null}
          {u.role ? <span>{u.role}</span> : null}
          {u.verified ? <Badge tone="info">Email matches store</Badge> : null}
          <span>{u.signedUp.slice(0, 10)}</span>
        </Meta>
      </>
    ),
  }));

  const previewRows: Row[] = (previews ?? []).map((d) => ({
    id: d.day,
    cells: [
      d.day,
      d.lookups,
      d.cached,
      d.fresh,
      d.products.toLocaleString("en-US"),
      d.avgMs === null ? "—" : `${(d.avgMs / 1000).toFixed(1)}s`,
    ],
    mobile: (
      <>
        <strong>{d.day}</strong>
        <Meta>
          <span>{d.lookups} lookups</span>
          <span>{d.fresh} fresh</span>
          <span>{d.products.toLocaleString("en-US")} products</span>
        </Meta>
      </>
    ),
  }));

  const storeRows: Row[] = report.stores.map((s) => ({
    id: s.storeId,
    cells: [<span key="d" className={styles.email}>{s.domain}</span>, s.followers, s.aiCalls, usd(s.cost), s.requests.toLocaleString("en-US")],
    mobile: (
      <>
        <span className={styles.email}>{s.domain}</span>
        <Meta>
          <span>{s.followers} followers</span>
          <span>{usd(s.cost)}</span>
          <span>{s.requests.toLocaleString("en-US")} requests</span>
        </Meta>
      </>
    ),
  }));

  const briefing = beta?.ratings.find((r) => r.target === "briefing");
  const alert = beta?.ratings.find((r) => r.target === "alert");

  return (
    <PageBody>
      <PageHeader title="Admin space" subtitle="Beta members, feedback, AI cost and usage. Only admins see this page." />

      <h2 className={styles.section}>Beta</h2>
      {beta ? (
        <>
          <div className={styles.stats}>
            <Stat label="Beta member spots" value={`${beta.foundingUsed} / ${beta.foundingCap}`} />
            <Stat
              label="Briefings rated useful"
              value={pct(briefing?.useful ?? 0, (briefing?.useful ?? 0) + (briefing?.notUseful ?? 0))}
              note={`${(briefing?.useful ?? 0) + (briefing?.notUseful ?? 0)} ratings`}
            />
            <Stat
              label="Alerts rated useful"
              value={pct(alert?.useful ?? 0, (alert?.useful ?? 0) + (alert?.notUseful ?? 0))}
              note={`${(alert?.useful ?? 0) + (alert?.notUseful ?? 0)} ratings`}
            />
          </div>
          <Card title="Beta members" titleId="beta-members" flush>
            <IndexTable
              columns={[
                { label: "User" },
                { label: "Beta member", width: 260 },
                { label: "Feedback calls", width: 170 },
                { label: "Discount", width: 100, align: "right" },
              ]}
              rows={memberRows}
              empty={<p className={styles.empty}>No users yet.</p>}
            />
          </Card>
          <Card title="Feedback and rating notes" titleId="beta-notes" flush>
            <IndexTable
              columns={[{ label: "Date", width: 110 }, { label: "Type", width: 190 }, { label: "From", width: 220 }, { label: "Message" }]}
              rows={noteRows}
              empty={<p className={styles.empty}>No feedback yet.</p>}
            />
          </Card>
        </>
      ) : (
        <Banner tone="warning" title="Beta data isn’t available">
          Is migration 0025 applied?
        </Banner>
      )}

      <div className={styles.sectionRow}>
        <h2 className={styles.section}>AI cost</h2>
        {monthNav}
      </div>
      <div className={styles.stats}>
        <Stat label="AI cost" value={usd(report.totalCost)} note="At list prices; Groq’s free tier costs $0" />
        <Stat label="AI calls" value={report.aiCalls.toLocaleString("en-US")} />
        <Stat label="Unallocated" value={usd(report.unallocated)} note="Store work nobody follows yet" />
      </div>
      <Card title="Cost per user" titleId="cost-users" flush>
        <IndexTable
          columns={[
            { label: "User" },
            { label: "Plan", width: 100 },
            { label: "Competitors", width: 120, align: "right" },
            { label: "Own (briefing)", width: 130, align: "right" },
            { label: "Shared (stores)", width: 130, align: "right" },
            { label: "Total", width: 100, align: "right" },
          ]}
          rows={costRows}
          empty={<p className={styles.empty}>No AI usage this month.</p>}
        />
      </Card>
      <Card title="Stores" titleId="cost-stores" flush>
        <IndexTable
          columns={[
            { label: "Store" },
            { label: "Followers", width: 110, align: "right" },
            { label: "AI calls", width: 110, align: "right" },
            { label: "AI cost", width: 110, align: "right" },
            { label: "Requests", width: 110, align: "right" },
          ]}
          rows={storeRows}
          empty={<p className={styles.empty}>No stores yet.</p>}
        />
      </Card>

      <h2 className={styles.section}>Users and growth</h2>
      <Card title="Users" titleId="users" flush>
        <IndexTable
          columns={[{ label: "User" }, { label: "Role", width: 150 }, { label: "Their store", width: 200 }, { label: "Verified brand", width: 170 }, { label: "Signed up", width: 110 }]}
          rows={userRows}
          empty={<p className={styles.empty}>No users yet.</p>}
        />
      </Card>
      <Card title="Homepage previews (last 14 days)" titleId="previews" flush>
        <IndexTable
          columns={[
            { label: "Day (UTC)" },
            { label: "Lookups", width: 100, align: "right" },
            { label: "From cache", width: 110, align: "right" },
            { label: "Fresh reads", width: 110, align: "right" },
            { label: "Products fetched", width: 150, align: "right" },
            { label: "Avg time", width: 100, align: "right" },
          ]}
          rows={previewRows}
          empty={<p className={styles.empty}>{previews ? "No lookups yet." : "Apply migration 0020 to log previews."}</p>}
        />
      </Card>
    </PageBody>
  );
}
