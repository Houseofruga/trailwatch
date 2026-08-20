import { redirect } from "next/navigation";
import { getAccount } from "@/features/account/queries";
import { getCompetitorsWithPages } from "@/features/competitors/queries";
import { LIMITS } from "@/features/plan/limits";
import { EditCompetitorForm } from "./EditCompetitorForm";

export default async function EditCompetitorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [account, competitors] = await Promise.all([getAccount(), getCompetitorsWithPages()]);
  if (!account) redirect("/login");

  const competitor = competitors.find((c) => c.id === id);
  if (!competitor) redirect("/competitors");

  return (
    <EditCompetitorForm
      competitor={competitor}
      pagesPerCompetitor={LIMITS[account.plan].pagesPerCompetitor}
    />
  );
}
