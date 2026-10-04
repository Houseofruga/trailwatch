import type { Metadata } from "next";
import { WelcomeView } from "@/components/app/WelcomeView";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewEnabled, previewState } from "@/features/appData/devState";
import * as mock from "@/features/appData/mock";
import { getBetaStatus, getRole, getWidgetOnboarding } from "@/features/appData/queries";

export const metadata: Metadata = { title: "Set up TrailWatch" };

const STATES = [
  "step-1-your-store",
  "step-2-empty",
  "step-2-adding",
  "step-2-with-stores",
  "step-2-invalid-address",
  "step-2-marketplace",
  "step-2-cant-reach",
  "step-2-not-on-shopify",
  "step-2-already-added",
  "step-2-own-store",
  "step-2-limit-reached",
  "step-2-suggestions-loading",
  "step-2-suggestions-none",
  "step-2-suggestions-failed",
  "step-2-no-own-store",
  "done",
] as const;
export type WelcomeState = (typeof STATES)[number];

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const raw = (await searchParams).state;
  const state = previewState(raw, STATES, "step-1-your-store");
  const live =
    previewEnabled && raw
      ? null
      : await Promise.all([getWidgetOnboarding(null), getRole()]).then(([w, role]) => ({
          ownDomain: w.ownStore?.domain ?? null,
          added: w.added,
          role,
          nextBriefing: w.nextBriefing,
        }));
  return (
    <>
      <WelcomeView key={state} state={state} live={live} beta={live ? await getBetaStatus() : await mock.getBetaStatus(0)} />
      <DevStateBar states={STATES} current={state} />
    </>
  );
}
