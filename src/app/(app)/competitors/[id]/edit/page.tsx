import { redirect } from "next/navigation";
import { getCompetitorsWithPages } from "@/features/competitors/queries";
import { EditCompetitorForm } from "./EditCompetitorForm";

export default async function EditCompetitorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const competitors = await getCompetitorsWithPages();
  const competitor = competitors.find((c) => c.id === id);
  if (!competitor) redirect("/competitors");

  return <EditCompetitorForm competitor={competitor} />;
}
