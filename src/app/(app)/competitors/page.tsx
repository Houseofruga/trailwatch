import type { Metadata } from "next";
import { CompetitorsView } from "@/components/app/CompetitorsView";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewState } from "@/features/appData/devState";
import { getOwnStore, listCompetitors } from "@/features/appData/mock";

export const metadata: Metadata = { title: "Competitors" };

const STATES = ["populated", "empty", "loading", "error"] as const;

export default async function CompetitorsPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const state = previewState((await searchParams).state, STATES, "populated");
  const [competitors, ownStore] = await Promise.all([listCompetitors(), getOwnStore()]);
  return (
    <>
      <CompetitorsView
        key={state}
        competitors={state === "empty" ? [] : competitors}
        loading={state === "loading"}
        error={state === "error"}
        ownDomain={ownStore?.domain ?? null}
      />
      <DevStateBar states={STATES} current={state} />
    </>
  );
}
