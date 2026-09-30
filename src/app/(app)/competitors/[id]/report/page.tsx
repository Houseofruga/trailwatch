import type { Metadata } from "next";
import { FirstReportView } from "@/components/app/FirstReportView";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewState } from "@/features/appData/devState";
import { getFirstReport } from "@/features/appData/mock";

export const metadata: Metadata = { title: "Snapshot" };

const STATES = ["default", "still-reading", "card-empty", "pages-only", "very-large", "error"] as const;

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const state = previewState(sp.state, STATES, "default");
  const report = await getFirstReport(state === "pages-only" ? "oakline-goods" : sp.state ? "dewlane" : id);

  if (report && state === "card-empty") report.onSale = { items: [], total: 0 };
  if (report && state === "very-large") {
    report.stats = { products: 25_000, productsCapped: true, onSale: 4812, soldOut: 1309, avgPrice: 9640 };
  }

  return (
    <>
      <FirstReportView key={state} report={report} reading={state === "still-reading"} error={state === "error"} />
      <DevStateBar states={STATES} current={state} />
    </>
  );
}
