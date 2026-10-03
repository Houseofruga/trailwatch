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
  "briefing-no-store",
  "briefing-plain",
  "briefing-quiet",
  "briefing-first",
  "add-competitor-modal",
  "add-competitor-modal-no-store",
] as const;
export type HomeState = (typeof STATES)[number];

export default async function HomePage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const raw = (await searchParams).state;
  const state = previewState(raw, STATES, "populated");
  const preview = previewEnabled && !!raw;

  let data;
  if (preview) {
    const variant = state.startsWith("briefing-") && state !== "briefing-off" ? (state.slice(9) as mock.BriefingPreview) : "normal";
    const [summary, moves, competitors, briefing] = await Promise.all([
      mock.getHomeSummary(),
      mock.listMoves({ busy: state === "busy-week" }),
      mock.listCompetitors(),
      mock.getBriefingPanel(variant),
    ]);
    data = { summary, moves, competitors, briefing };
  } else {
    const [moves, competitors, briefing] = await Promise.all([real.listMoves(), real.listCompetitors(), real.getBriefingPanel()]);
    // No competitors yet: onboarding isn't finished (UX_SPEC §4.4).
    if (competitors.length === 0) redirect("/welcome");
    data = { summary: await real.getHomeSummary(moves), moves, competitors, briefing };
  }
  const { summary, moves, competitors, briefing } = data;

  return (
    <>
      <HomeView
        key={state}
        state={state}
        summary={state === "briefing-off" ? { ...summary, nextBriefing: null } : summary}
        moves={state === "no-moves-yet" ? [] : moves}
        competitors={competitors}
        briefing={briefing}
      />
      <DevStateBar states={STATES} current={state} />
    </>
  );
}
