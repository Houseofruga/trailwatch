import type { Metadata } from "next";
import { OpportunitiesView } from "@/components/app/OpportunitiesView";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewEnabled, previewState } from "@/features/appData/devState";
import * as mock from "@/features/appData/mock";
import * as real from "@/features/appData/queries";

export const metadata: Metadata = { title: "Opportunities" };

// DESIGN 11-opps states (dev only): 11a list, 11b expanded, 11e no own store,
// 11f still learning, 11g Best Sellers unavailable, 11h loading, 11i not on plan.
const STATES = ["list", "expanded", "no-own-store", "still-learning", "unavailable", "loading", "not-on-plan"] as const;

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const raw = (await searchParams).state;
  const state = previewState(raw, STATES, "list");
  const demo = previewEnabled && !!raw;
  const page = demo
    ? await mock.getOpportunitiesPage(state === "no-own-store" || state === "still-learning" || state === "not-on-plan" ? state : "list")
    : await real.getOpportunitiesPage();
  const firstId = page.items[0]?.id;
  // 11g: the towels gap, whose evidence includes a store without a readable list.
  const towels = page.items.find((o) => o.kind === "category_gap")?.id;
  return (
    <>
      <OpportunitiesView
        key={state}
        page={page}
        loading={state === "loading"}
        initialExpanded={state === "expanded" ? firstId : state === "unavailable" ? towels : undefined}
        demo={demo}
      />
      <DevStateBar states={STATES} current={state} />
    </>
  );
}
