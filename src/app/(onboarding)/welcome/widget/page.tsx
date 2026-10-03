import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WidgetOnboardingView, type WidgetStep } from "@/components/app/WidgetOnboardingView";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewEnabled, previewState } from "@/features/appData/devState";
import * as mock from "@/features/appData/mock";
import { DEFAULT_BRIEFING, nextBriefingAt } from "@/features/briefing/schedule";
import { getWidgetOnboarding, type WidgetOnboarding } from "@/features/appData/queries";

export const metadata: Metadata = { title: "Set up TrailWatch" };

const STEPS: WidgetStep[] = ["snapshot", "store", "competitors", "done"];
// Design-review states (dev `?state=` only), 10-onboard.
const STATES = ["snapshot", "snapshot-reading", "snapshot-pages-only", "store", "store-same-domain", "competitors", "done"] as const;

export default async function WidgetOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; step?: string; state?: string }>;
}) {
  const sp = await searchParams;
  if (previewEnabled && sp.state) {
    const state = previewState(sp.state, STATES, "snapshot");
    const step = state.split("-")[0] as WidgetStep;
    return (
      <>
        <WidgetOnboardingView
          key={state}
          step={step}
          data={await mockData(state)}
          demoSameDomain={state === "store-same-domain"}
          demoSuggestions={DEMO_SUGGESTIONS}
        />
        <DevStateBar states={STATES} current={state} />
      </>
    );
  }

  const step = STEPS.includes(sp.step as WidgetStep) ? (sp.step as WidgetStep) : "snapshot";
  const data = await getWidgetOnboarding(sp.c ?? null);
  if (step === "snapshot" && !data.competitor) redirect("/welcome");
  const reading = step === "snapshot" ? !!data.first?.reading : step === "competitors" && !!data.ownStore && data.ownStore.products === null;
  return (
    <>
      <WidgetOnboardingView step={step} data={data} />
      {/* The competitor's (or your own) first read is still running: refresh until it lands. */}
      {reading ? <AutoRefresh everyMs={5000} /> : null}
    </>
  );
}

const DEMO_SUGGESTIONS = [
  { name: "Hearth & Pine", domain: "hearthandpine.com", why: "Sells candles and throws at similar prices." },
  { name: "Northknot", domain: "northknot.com", why: "Also sells home textiles and candles." },
  { name: "Oakgrove", domain: "oakgrove.co", why: "Sells pillows and throws like Dewlane." },
  { name: "Pinetide", domain: "pinetide.com", why: "" },
];

async function mockData(state: (typeof STATES)[number]): Promise<WidgetOnboarding> {
  const report = await mock.getFirstReport(state === "snapshot-pages-only" ? "oakline-goods" : "dewlane");
  const c = report!.competitor;
  return {
    competitor: { id: c.id, name: c.name, domain: c.domain },
    first: { report, reading: state === "snapshot-reading", error: false },
    ownStore: state === "competitors" ? { domain: "glowfield.com", products: null, checkedAt: new Date().toISOString() } : null,
    added: [{ id: c.id, name: c.name, domain: c.domain, status: "ready", products: 313 }],
    limit: 10,
    nextBriefing: nextBriefingAt(new Date(), DEFAULT_BRIEFING.hour, DEFAULT_BRIEFING.timeZone).toISOString(),
  };
}
