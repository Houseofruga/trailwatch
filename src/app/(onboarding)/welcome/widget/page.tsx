import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WidgetOnboardingView, type WidgetStep } from "@/components/app/WidgetOnboardingView";
import { AutoRefresh } from "@/components/ui/AutoRefresh";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewEnabled, previewState } from "@/features/appData/devState";
import * as mock from "@/features/appData/mock";
import { DEFAULT_BRIEFING, nextBriefingAt } from "@/features/briefing/schedule";
import { getBetaStatus, getWidgetOnboarding, type WidgetOnboarding } from "@/features/appData/queries";

export const metadata: Metadata = { title: "Set up Trailwatch" };

const STEPS: WidgetStep[] = ["store", "competitors", "done"];
// Design-review states (dev `?state=` only), 10-onboard.
const STATES = ["store", "store-same-domain", "competitors", "done"] as const;

export default async function WidgetOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; step?: string; state?: string }>;
}) {
  const sp = await searchParams;
  if (previewEnabled && sp.state) {
    const state = previewState(sp.state, STATES, "store");
    const step = state.split("-")[0] as WidgetStep;
    return (
      <>
        <WidgetOnboardingView
          key={state}
          step={step}
          data={await mockData(state)}
          demoSameDomain={state === "store-same-domain"}
          demoSuggestions={DEMO_SUGGESTIONS}
          beta={await mock.getBetaStatus(0)}
        />
        <DevStateBar states={STATES} current={state} />
      </>
    );
  }

  const step = STEPS.includes(sp.step as WidgetStep) ? (sp.step as WidgetStep) : "store";
  const data = await getWidgetOnboarding(sp.c ?? null);
  // Your store is required: no going past that step without one.
  if ((step === "competitors" || step === "done") && !data.ownStore) {
    redirect(`/welcome/widget?${new URLSearchParams({ step: "store", ...(sp.c ? { c: sp.c } : {}) })}`);
  }
  const reading = step === "competitors" && !!data.ownStore && data.ownStore.products === null;
  return (
    <>
      <WidgetOnboardingView step={step} data={data} beta={step === "done" ? await getBetaStatus() : null} />
      {/* Your store's first read is still running: refresh until it lands. */}
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
  const report = await mock.getFirstReport("dewlane");
  const c = report!.competitor;
  return {
    competitor: { id: c.id, name: c.name, domain: c.domain },
    first: { report, reading: false, error: false },
    ownStore: state === "competitors" ? { domain: "glowfield.com", products: null, checkedAt: new Date().toISOString() } : null,
    added: [{ id: c.id, name: c.name, domain: c.domain, status: "ready", products: 313 }],
    limit: 10,
    nextBriefing: nextBriefingAt(new Date(), DEFAULT_BRIEFING.hour, DEFAULT_BRIEFING.timeZone).toISOString(),
  };
}
