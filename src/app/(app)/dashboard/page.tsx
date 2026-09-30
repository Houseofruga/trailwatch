import type { Metadata } from "next";
import { HomeView } from "@/components/app/HomeView";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewState } from "@/features/appData/devState";
import { getHomeSummary, getOwnStore, listCompetitors, listMoves } from "@/features/appData/mock";

export const metadata: Metadata = { title: "Home" };

const STATES = [
  "populated",
  "busy-week",
  "no-moves-yet",
  "filters-match-nothing",
  "loading",
  "error",
  "briefing-off",
  "add-competitor-modal",
] as const;
export type HomeState = (typeof STATES)[number];

export default async function HomePage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const state = previewState((await searchParams).state, STATES, "populated");
  const [summary, moves, competitors, ownStore] = await Promise.all([
    getHomeSummary(),
    listMoves({ busy: state === "busy-week" }),
    listCompetitors(),
    getOwnStore(),
  ]);

  return (
    <>
      <HomeView
        key={state}
        state={state}
        summary={state === "briefing-off" ? { ...summary, nextBriefing: null } : summary}
        moves={state === "no-moves-yet" ? [] : moves}
        competitors={competitors}
        ownDomain={ownStore?.domain ?? null}
      />
      <DevStateBar states={STATES} current={state} />
    </>
  );
}
