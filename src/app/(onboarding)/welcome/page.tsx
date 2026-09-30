import type { Metadata } from "next";
import { WelcomeView } from "@/components/app/WelcomeView";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewState } from "@/features/appData/devState";

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
  "building-report",
  "slow",
] as const;
export type WelcomeState = (typeof STATES)[number];

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const state = previewState((await searchParams).state, STATES, "step-1-your-store");
  return (
    <>
      <WelcomeView key={state} state={state} />
      <DevStateBar states={STATES} current={state} />
    </>
  );
}
