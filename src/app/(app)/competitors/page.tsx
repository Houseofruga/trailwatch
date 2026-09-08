import { Suspense } from "react";
import { ButtonLink } from "@/components/Button";
import { PlusIcon } from "@/components/icons";
import { FlashToast } from "@/components/FlashToast";
import { getCompetitorsWithPages } from "@/features/competitors/queries";
import { ManageBoard } from "./ManageBoard";
import styles from "./page.module.css";

export default async function CompetitorsPage() {
  const competitors = await getCompetitorsWithPages();
  // Server Component: one deterministic clock read per request (not a client
  // render impurity) — powers "Checked Nm ago" on each card.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const pageCount = competitors.reduce((n, c) => n + c.pages.length, 0);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Competitors</h1>
          {competitors.length > 0 ? (
            <p className={styles.sub}>
              {competitors.length} competitor{competitors.length === 1 ? "" : "s"} · {pageCount} page
              {pageCount === 1 ? "" : "s"} tracked
            </p>
          ) : null}
        </div>
        <ButtonLink href="/competitors/add">
          <PlusIcon />
          Add competitor
        </ButtonLink>
      </div>

      <ManageBoard competitors={competitors} now={now} />

      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>
    </div>
  );
}
