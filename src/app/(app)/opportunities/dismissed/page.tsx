import type { Metadata } from "next";
import { DismissedOpportunitiesView } from "@/components/app/DismissedOpportunitiesView";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewEnabled, previewState } from "@/features/appData/devState";
import * as mock from "@/features/appData/mock";
import * as real from "@/features/appData/queries";

export const metadata: Metadata = { title: "Dismissed opportunities" };

const STATES = ["populated", "empty"] as const;

export default async function DismissedOpportunitiesPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const raw = (await searchParams).state;
  const state = previewState(raw, STATES, "populated");
  const demo = previewEnabled && !!raw;
  const items = demo ? await mock.listDismissedOpportunities() : await real.listDismissedOpportunities();
  return (
    <>
      <DismissedOpportunitiesView key={state} items={state === "empty" ? [] : items} demo={demo} />
      <DevStateBar states={STATES} current={state} />
    </>
  );
}
