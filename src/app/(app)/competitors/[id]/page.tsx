import type { Metadata } from "next";
import { CompetitorDetailView } from "@/components/app/CompetitorDetailView";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewEnabled, previewState } from "@/features/appData/devState";
import * as mock from "@/features/appData/mock";
import * as real from "@/features/appData/queries";

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
  const preview = previewEnabled && !!sp.state;
  const competitorId = preview && COMPETITOR_FOR[state] ? COMPETITOR_FOR[state]! : id;
  const [competitor, moves] = preview
    ? await Promise.all([state === "not-found" ? null : mock.getCompetitorOverview(competitorId), mock.listCompetitorMoves(competitorId)])
    : await Promise.all([real.getCompetitorOverview(id), real.listMoves({ competitorId: id })]);
  // The same 90 days Home lists, so a move opened from Home is always here.
  // Nothing yet from a competitor added this month reads "No moves yet"; an
  // older one with a quiet stretch reads "No moves in the last 90 days".
  const noMovesYet = preview
    ? state === "no-moves-yet"
    : !!competitor && moves.length === 0 && real.addedThisMonth(competitor.addedAt);

  return (
    <>
      <CompetitorDetailView
        key={`${competitorId}-${state}`}
        competitor={competitor}
        moves={state === "no-moves-yet" ? [] : moves}
        noMovesYet={noMovesYet}
        loading={state === "loading"}
        error={state === "error"}
        openRemove={state === "remove-modal"}
        highlight={preview && state === "from-email" ? "m1" : undefined}
      />
      <DevStateBar states={STATES} current={state} />
    </>
  );
}
