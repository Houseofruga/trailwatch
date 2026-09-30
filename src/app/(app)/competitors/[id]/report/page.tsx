import type { Metadata } from "next";
import { FirstReportView } from "@/components/app/FirstReportView";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewEnabled, previewState } from "@/features/appData/devState";
import * as mock from "@/features/appData/mock";
import { getFirstReport } from "@/features/appData/queries";

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

  if (!(previewEnabled && sp.state)) {
    const { report, reading, error } = await getFirstReport(id);
    return (
      <>
        <FirstReportView report={report} reading={reading} error={error} />
        {/* Still reading: check again every 5s until the first read lands (UX_SPEC §4.3). */}
        {reading ? <AutoRefresh everyMs={5000} /> : null}
      </>
    );
  }

  const report = await mock.getFirstReport(state === "pages-only" ? "oakline-goods" : "dewlane");
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
