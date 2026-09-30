import type { Metadata } from "next";
import { CompetitorDetailView } from "@/components/app/CompetitorDetailView";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewState } from "@/features/appData/devState";
import { getCompetitorOverview, listCompetitorMoves } from "@/features/appData/mock";

export const metadata: Metadata = { title: "Competitor" };

// Preview states. The first five pick the competitor the design drew for them.
const STATES = [
  "busy",
  "from-email",
  "quiet",
  "pages-only",
  "cant-reach",
  "no-moves-yet",
  "not-found",
  "loading",
  "error",
  "remove-modal",
] as const;
const COMPETITOR_FOR: Partial<Record<(typeof STATES)[number], string>> = {
  busy: "hearth-and-pine",
  "from-email": "hearth-and-pine",
  quiet: "dewlane",
  "pages-only": "oakline-goods",
  "cant-reach": "peak-tonic",
  "no-moves-yet": "dewlane",
};

export default async function CompetitorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const state = previewState(sp.state, STATES, "busy");
  const competitorId = sp.state && COMPETITOR_FOR[state] ? COMPETITOR_FOR[state] : id;
  const [competitor, moves] = await Promise.all([
    state === "not-found" ? null : getCompetitorOverview(competitorId),
    listCompetitorMoves(competitorId),
  ]);

  return (
    <>
      <CompetitorDetailView
        key={`${competitorId}-${state}`}
        competitor={competitor}
        moves={state === "no-moves-yet" ? [] : moves}
        noMovesYet={state === "no-moves-yet"}
        loading={state === "loading"}
        error={state === "error"}
        openRemove={state === "remove-modal"}
        highlight={state === "from-email" ? "m1" : undefined}
      />
      <DevStateBar states={STATES} current={state} />
    </>
  );
}
