import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { getChangeDetail } from "@/features/changes/queries";
import { ChangeDetailCrumb, ChangeDetailBody } from "./ChangeDetailView";
import styles from "./page.module.css";

// The change-detail page (SPEC prototype "CHANGE DETAIL"). This full page is the
// fallback for a direct visit / refresh / shared link; in-app navigation shows the
// same content in the intercepting-route modal (see (app)/@modal). Serves both real
// changes (from the DB, RLS-scoped) and the display-only demo changes.
export default async function ChangeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Server Component: reading the clock here is deterministic for the response.
  // eslint-disable-next-line react-hooks/purity
  const detail = await getChangeDetail(id, Date.now());
  if (!detail) notFound();

  return (
    <div className={styles.wrap}>
      <BackLink href="/dashboard" />
      <ChangeDetailCrumb detail={detail} />
      <ChangeDetailBody detail={detail} />
    </div>
  );
}
