import { notFound } from "next/navigation";
import { ChangeDetailModal } from "@/components/ChangeDetailModal";
import { ChangeDetailCrumb, ChangeDetailBody } from "@/app/(app)/changes/[id]/ChangeDetailView";
import { getChangeDetail } from "@/features/changes/queries";

// Intercepts in-app navigation to /changes/[id] and shows the detail as an overlay
// modal over the current page (dashboard / competitors). The `(.)` matches the
// sibling `changes` segment — segment-counting ignores the @modal slot folder. A
// hard visit / refresh isn't intercepted and renders the full page instead.
export default async function ChangeDetailModalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Server Component: reading the clock here is deterministic for the response.
  // eslint-disable-next-line react-hooks/purity
  const detail = await getChangeDetail(id, Date.now());
  if (!detail) notFound();

  return (
    <ChangeDetailModal header={<ChangeDetailCrumb detail={detail} compact />}>
      <ChangeDetailBody detail={detail} />
    </ChangeDetailModal>
  );
}
