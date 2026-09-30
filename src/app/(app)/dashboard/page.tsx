import type { Metadata } from "next";
import { HomeView } from "@/components/app/HomeView";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { redirect } from "next/navigation";
import { previewEnabled, previewState } from "@/features/appData/devState";
import * as mock from "@/features/appData/mock";
import * as real from "@/features/appData/queries";

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
  const raw = (await searchParams).state;
  const state = previewState(raw, STATES, "populated");
  const preview = previewEnabled && !!raw;

  let data;
  if (preview) {
    const [summary, moves, competitors] = await Promise.all([
      mock.getHomeSummary(),
      mock.listMoves({ busy: state === "busy-week" }),
      mock.listCompetitors(),
    ]);
    data = { summary, moves, competitors };
  } else {
    const [moves, competitors] = await Promise.all([real.listMoves(), real.listCompetitors()]);
    // No competitors yet: onboarding isn't finished (UX_SPEC §4.4).
    if (competitors.length === 0) redirect("/welcome");
    data = { summary: await real.getHomeSummary(moves), moves, competitors };
  }
  const { summary, moves, competitors } = data;

  return (
    <>
      <HomeView
        key={state}
        state={state}
        summary={state === "briefing-off" ? { ...summary, nextBriefing: null } : summary}
        moves={state === "no-moves-yet" ? [] : moves}
        competitors={competitors}
      />
      <DevStateBar states={STATES} current={state} />
    </>
  );
}
