import Link from "next/link";
import { redirect } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { UpgradeButton } from "@/features/billing/UpgradeButton";
import { createClient } from "@/lib/supabase/server";
import { getAccount } from "@/features/account/queries";
import { getCompetitorsWithPages } from "@/features/competitors/queries";
import { LIMITS, PLAN_LABEL } from "@/features/plan/limits";
import { AddForm } from "./AddForm";
import styles from "./page.module.css";

export default async function AddCompetitorPage({
  searchParams,
}: {
  searchParams: Promise<{ for?: string }>;
}) {
  const { for: competitorId } = await searchParams;
  const account = await getAccount();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!account || !user) redirect("/login");

  const limits = LIMITS[account.plan];
  const planLabel = PLAN_LABEL[account.plan];

  // Reached only via "Upgrade to add more pages" — adding a page when
  // there's room now happens in a modal on the Competitors page instead.
  if (competitorId) {
    const competitors = await getCompetitorsWithPages();
    const competitor = competitors.find((c) => c.id === competitorId);
    if (!competitor) redirect("/competitors");

    const slotsLeft = limits.pagesPerCompetitor - competitor.pages.length;
    if (slotsLeft > 0) redirect("/competitors");

    return (
      <div className={styles.wrap}>
        <BackLink href="/competitors">Competitors</BackLink>

        <BlockedUpsell
          title={`${competitor.name} is at its page limit`}
          body={`${competitor.name} already tracks ${limits.pagesPerCompetitor} pages on ${planLabel}. Upgrade for more pages per competitor, or remove one first.`}
          swapHref="/competitors"
          swapLabel="Or manage its existing pages →"
          showUpsell={account.plan === "free"}
          email={account.email}
          userId={user.id}
        />
      </div>
    );
  }

  // New-competitor mode.
  const slotsLeft = limits.competitors - account.competitorCount;
  const blocked = slotsLeft <= 0;

  return (
    <div className={styles.wrap}>
      <BackLink href="/dashboard">Dashboard</BackLink>

      {blocked ? (
        <BlockedUpsell
          title={`You've used your ${planLabel} competitor${limits.competitors === 1 ? "" : "s"}`}
          body={
            account.plan === "free"
              ? "Free tracks two competitors with up to three pages each. Pro raises that to ten competitors and ten pages each — same daily checks, same weekly digest."
              : `You're tracking all ${limits.competitors} competitors Pro allows.`
          }
          swapHref="/competitors"
          swapLabel="Or swap out an existing competitor →"
          showUpsell={account.plan === "free"}
          email={account.email}
          userId={user.id}
        />
      ) : (
        <AddForm
          slotsLeft={slotsLeft}
          totalCompetitorSlots={limits.competitors}
          pagesPerCompetitor={limits.pagesPerCompetitor}
        />
      )}
    </div>
  );
}

function BlockedUpsell({
  title,
  body,
  swapHref,
  swapLabel,
  showUpsell,
  email,
  userId,
}: {
  title: string;
  body: string;
  swapHref: string;
  swapLabel: string;
  showUpsell: boolean;
  email: string;
  userId: string;
}) {
  return (
    <div>
      <h1 className={styles.blockTitle}>{title}</h1>
      <p className={styles.blockBody}>{body}</p>

      {showUpsell ? (
        <div className={styles.upsell}>
          <div className={styles.upsellHead}>
            <div className={styles.upsellName}>Pro</div>
            <div className={styles.upsellPrice}>
              <span style={{ fontWeight: 500 }}>$19</span>
              <span className={styles.upsellPricePer}>/month</span>
            </div>
          </div>
          <div className={styles.upsellFeatures}>
            <div>10 competitors, 10 pages each</div>
            <div>Daily checks with noise filtering</div>
            <div>Weekly email digest</div>
            <div>Cancel any time</div>
          </div>
          {/* Opens the Paddle checkout overlay right here (matching the $19/mo
              shown); on success it polls until the account flips to Pro and this
              page re-renders unblocked — no detour through /billing. */}
          <UpgradeButton email={email} userId={userId} period="monthly" />
        </div>
      ) : null}

      <Link href={swapHref} className={styles.swap}>
        {swapLabel}
      </Link>
    </div>
  );
}
