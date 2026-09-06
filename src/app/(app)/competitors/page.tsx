import { Suspense } from "react";
import { ButtonLink } from "@/components/Button";
import { PlusIcon } from "@/components/icons";
import { FlashToast } from "@/components/FlashToast";
import { getCompetitorsWithPages } from "@/features/competitors/queries";
import { getAccount } from "@/features/account/queries";
import { LIMITS } from "@/features/plan/limits";
import { ManageBoard } from "./ManageBoard";
import styles from "./page.module.css";

// The Wayback backfill (HistoryPanel's loadPageHistory action) fetches several
// archived pages + summarizes them; give it headroom over the default so a first
// expand can't hit the function timeout.
export const maxDuration = 60;

export default async function CompetitorsPage() {
  const [competitors, account] = await Promise.all([getCompetitorsWithPages(), getAccount()]);
  const pagesPerCompetitor = LIMITS[account?.plan ?? "free"].pagesPerCompetitor;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Competitors</h1>
          <p className={styles.sub}>Pause a page to stop checking it without losing its history.</p>
        </div>
        <ButtonLink href="/competitors/add">
          <PlusIcon />
          Add competitor
        </ButtonLink>
      </div>

      <ManageBoard competitors={competitors} pagesPerCompetitor={pagesPerCompetitor} />

      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>
    </div>
  );
}
