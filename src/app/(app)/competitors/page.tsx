import type { Metadata } from "next";
import { CompetitorsView } from "@/components/app/CompetitorsView";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewEnabled, previewState } from "@/features/appData/devState";
import * as mock from "@/features/appData/mock";
import * as real from "@/features/appData/queries";

export const metadata: Metadata = { title: "Competitors" };

const STATES = ["populated", "empty", "loading", "error"] as const;

export default async function CompetitorsPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const raw = (await searchParams).state;
  const state = previewState(raw, STATES, "populated");
  const src = previewEnabled && raw ? mock : real;
  const competitors = await src.listCompetitors();
  return (
    <>
      <CompetitorsView
        key={state}
        competitors={state === "empty" ? [] : competitors}
        loading={state === "loading"}
        error={state === "error"}
      />
      <DevStateBar states={STATES} current={state} />
    </>
  );
}
