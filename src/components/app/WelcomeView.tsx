"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { WelcomeState } from "@/app/(onboarding)/welcome/page";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/Feedback";
import { Stepper } from "@/components/ui/Guides";
import { IconCheck, IconClock, IconX, SpinnerIcon } from "@/components/ui/icons";
import { PageBody } from "@/components/ui/Page";
import { TextField } from "@/components/ui/TextField";
import { addCompetitor, onboardingStatus, removeCompetitor, saveOwnStore } from "@/features/appData/actions";
import { ADD_MESSAGES, checkStoreInput } from "@/features/appData/mockAdd";
import type { OnboardingItem } from "@/features/appData/types";
import styles from "./WelcomeView.module.css";

const LIMIT = 10;
const LIST_PREVIEW = 5;
const POLL_MS = 3000;
/** After this long on "Building your first report", show the slow state. */
const SLOW_MS = 60_000;

type Added = OnboardingItem;

// Design-review data (dev `?state=` only).
const item = (name: string, domain: string, status: Added["status"] = "ready", products: number | null = null): Added => ({
  id: domain,
  name,
  domain,
  status,
  products,
});
const HP = item("Hearth & Pine", "hearthandpine.com", "ready", 1632);
const DW = item("Dewlane", "dewlane.com", "ready", 313);
const NK = item("Northwind Knits", "northwindknits.com");
const OG = item("Oakline Goods", "oaklinegoods.com", "pages");
const PT = item("Peak Tonic", "peaktonic.com");
const MORE = ["Linden Loom", "Harbor Hemp", "Tallgrass Home", "Birch & Bay", "Quietwood"].map((name) =>
  item(name, `${name.toLowerCase().replace(/[^a-z]/g, "")}.com`),
);

// Designed states (02-Onboarding): the list and field each one starts with.
const PRESETS: Partial<Record<WelcomeState, { added: Added[]; value?: string; error?: string }>> = {
  "step-2-empty": { added: [] },
  "step-2-adding": { added: [HP], value: "dewlane.com" },
  "step-2-with-stores": {
    added: [HP, { ...DW, status: "reading" }, OG, { ...PT, status: "failed" }],
  },
  "step-2-invalid-address": { added: [HP], value: "dewlane", error: ADD_MESSAGES.invalid },
  "step-2-marketplace": { added: [HP], value: "amazon.com/stores/Dewlane", error: ADD_MESSAGES.marketplace },
  "step-2-cant-reach": { added: [HP], value: "dewlane.co", error: ADD_MESSAGES.unreachable },
  "step-2-not-on-shopify": { added: [HP, OG] },
  "step-2-already-added": { added: [HP, DW], value: "hearthandpine.com", error: ADD_MESSAGES.duplicate("Hearth & Pine") },
  "step-2-own-store": { added: [HP], value: "glowfield.com", error: ADD_MESSAGES.own },
  "step-2-limit-reached": { added: [HP, DW, NK, OG, PT, ...MORE] },
};

function StatusBadge({ status }: { status: Added["status"] }) {
  if (status === "reading")
    return (
      <Badge tone="info" spinner>
        Reading catalog…
      </Badge>
    );
  if (status === "pages") return <Badge>Pages only</Badge>;
  if (status === "failed") return <Badge tone="critical">Couldn&rsquo;t read</Badge>;
  return <Badge tone="success">Ready</Badge>;
}

// Picks from the homepage finder, saved before signup (CompetitorFinder.tsx).
const PENDING_COMPETITORS = "tw_pending_competitors";
const PENDING_COMPANY = "tw_pending_company";

function takePending(): { company: string | null; urls: string[] } {
  try {
    const company = localStorage.getItem(PENDING_COMPANY);
    const list = JSON.parse(localStorage.getItem(PENDING_COMPETITORS) ?? "[]") as { url?: unknown }[];
    localStorage.removeItem(PENDING_COMPANY);
    localStorage.removeItem(PENDING_COMPETITORS);
    const urls = Array.isArray(list) ? list.map((c) => (typeof c.url === "string" ? c.url.trim() : "")).filter(Boolean) : [];
    return { company: company && /\.[a-z]{2,}/i.test(company) ? company.trim() : null, urls };
  } catch {
    return { company: null, urls: [] };
  }
}

/** The store whose report opens first: the first one added with a catalog, else the first one. */
const reportTarget = (list: Added[]) => list.find((a) => a.status !== "pages") ?? list[0];

export function WelcomeView({
  state,
  live,
}: {
  state: WelcomeState;
  /** Real data; null on a design-review preview. */
  live: { ownDomain: string | null; added: Added[] } | null;
}) {
  const router = useRouter();
  const preset = live ? undefined : PRESETS[state];
  const [step, setStep] = useState<1 | 2 | 3>(
    live ? (live.added.length > 0 ? 2 : 1) : state === "step-1-your-store" ? 1 : preset ? 2 : 3,
  );
  const [store, setStore] = useState(live ? (live.ownDomain ?? "") : "glowfield.com");
  const [storeError, setStoreError] = useState<string | null>(null);
  const [savingStore, setSavingStore] = useState(false);
  const [added, setAdded] = useState<Added[]>(
    live ? live.added : (preset?.added ?? [HP, { ...DW, status: "reading" }, OG]),
  );
  const [value, setValue] = useState(preset?.value ?? "");
  const [error, setError] = useState<string | null>(preset?.error ?? null);
  const [adding, setAdding] = useState(state === "step-2-adding" && !live);
  const [showAll, setShowAll] = useState(false);
  const [buildingSince, setBuildingSince] = useState<number | null>(null);
  const [slowNow, setSlowNow] = useState(false);

  const full = added.length >= LIMIT;
  const slow = live ? slowNow : state === "slow";
  const reading = added.some((a) => a.status === "reading");

  // Live: carry over what the visitor picked on the homepage before signing up —
  // their store fills step 1, their competitors are added (once, then cleared).
  useEffect(() => {
    if (!live || live.added.length > 0) return;
    void (async () => {
      const pending = takePending();
      if (pending.company && !live.ownDomain) setStore(pending.company);
      if (pending.urls.length === 0) return;
      setAdding(true);
      for (const url of pending.urls.slice(0, LIMIT)) {
        const res = await addCompetitor(url);
        if (!res.ok) {
          // Show the first one we couldn't add, so they can fix or skip it.
          setValue((v) => v || url);
          setError((e) => e ?? res.error);
        }
      }
      setAdded(await onboardingStatus());
      setAdding(false);
    })();
  }, [live]);

  // Live: poll each store's first read while any is still reading.
  useEffect(() => {
    if (!live || step === 1 || !reading) return;
    const t = setInterval(() => void onboardingStatus().then(setAdded), POLL_MS);
    return () => clearInterval(t);
  }, [live, step, reading]);

  // Live: open the first report once its store is read (or its read failed).
  const target = reportTarget(added);
  useEffect(() => {
    if (!live || step !== 3 || !target) return;
    if (target.status !== "reading") router.push(`/competitors/${target.id}/report`);
  }, [live, step, target, router]);

  // Live: switch to the slow state after a minute.
  useEffect(() => {
    if (!live || buildingSince === null) return;
    const t = setTimeout(() => setSlowNow(true), Math.max(0, buildingSince + SLOW_MS - Date.now()));
    return () => clearTimeout(t);
  }, [live, buildingSince]);

  async function continueFromStore(e: React.FormEvent) {
    e.preventDefault();
    if (!live || store.trim() === (live.ownDomain ?? "") || !store.trim()) return setStep(2);
    setSavingStore(true);
    const res = await saveOwnStore(store);
    setSavingStore(false);
    if (!res.ok) return setStoreError(res.error);
    setStoreError(null);
    setStep(2);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!live) {
      const check = checkStoreInput(value, { ownDomain: store || null, existing: added });
      if (!check.ok) return setError(check.error);
      setError(null);
      setAdding(true);
      await new Promise((r) => setTimeout(r, 700));
      setAdding(false);
      setAdded((a) => [...a, item(check.name, check.host, "reading")]);
      setValue("");
      return;
    }
    setAdding(true);
    const res = await addCompetitor(value);
    if (res.ok) {
      setAdded(await onboardingStatus());
      setValue("");
      setError(null);
    } else {
      setError(res.error);
    }
    setAdding(false);
  }

  async function remove(a: Added) {
    setAdded((list) => list.filter((x) => x.id !== a.id));
    if (live) await removeCompetitor(a.id);
  }

  function seeReport() {
    setStep(3);
    setBuildingSince(Date.now());
  }

  const shown = showAll ? added : added.slice(0, LIST_PREVIEW);
  const done = added.filter((a) => a.status !== "reading").length;

  return (
    <PageBody narrow>
      <Stepper steps={["Your store", "Competitors"]} current={step === 1 ? 0 : 1} />

      {step === 1 ? (
        <Card>
          <form className={styles.card} onSubmit={continueFromStore} noValidate>
            <h1 className={styles.title}>What&rsquo;s your store?</h1>
            <p className={styles.lead}>We&rsquo;ll compare your competitors&rsquo; prices with yours.</p>
            <div className={styles.spacer} />
            <TextField
              id="own-store"
              label="Your store’s website"
              prefix="https://"
              placeholder="yourstore.com"
              inputMode="url"
              autoComplete="off"
              value={store}
              error={storeError}
              onChange={(e) => setStore(e.target.value)}
            />
            <div className={styles.actions}>
              <Button variant="primary" type="submit" loading={savingStore}>
                Continue
              </Button>
              <Button variant="plain" onClick={() => setStep(2)}>
                Skip for now
              </Button>
            </div>
          </form>
        </Card>
      ) : step === 2 ? (
        <Card>
          <div className={styles.card}>
            <h1 className={styles.title}>Who do you compete with?</h1>
            <p className={styles.lead}>Add up to {LIMIT} stores during the beta. Use their own website, not an Amazon or Etsy page.</p>
            <div className={styles.spacer} />
            {full ? <Banner tone="info" title={`You've added ${LIMIT} stores`}>That&rsquo;s the beta limit. Remove one to add another.</Banner> : null}
            <form onSubmit={add} noValidate>
              <TextField
                id="competitor-url"
                label="Competitor’s website"
                prefix="https://"
                placeholder="dewlane.com"
                inputMode="url"
                autoComplete="off"
                value={value}
                disabled={full}
                onChange={(e) => setValue(e.target.value)}
                error={error}
                trailing={
                  <Button type="submit" loading={adding} disabled={full}>
                    Add
                  </Button>
                }
              />
            </form>

            {added.length > 0 ? (
              <>
                <p className={styles.addedCount}>
                  Added · {added.length} of {LIMIT}
                </p>
                <ul className={styles.list}>
                  {shown.map((a) => (
                    <li key={a.id} className={styles.item}>
                      <Avatar name={a.name} size={32} />
                      <div className={styles.itemText}>
                        <span className={styles.itemName}>{a.name}</span>
                        <span className={styles.itemSub}>{a.domain}</span>
                        {a.status === "pages" ? (
                          <span className={styles.itemNote}>Not on Shopify. We&rsquo;ll watch its pages, not its catalog.</span>
                        ) : a.status === "failed" ? (
                          <span className={styles.itemNote}>We couldn&rsquo;t open {a.domain}. Remove it or try again later.</span>
                        ) : null}
                      </div>
                      <StatusBadge status={a.status} />
                      <button type="button" aria-label={`Remove ${a.name}`} className={styles.remove} onClick={() => void remove(a)}>
                        <IconX />
                      </button>
                    </li>
                  ))}
                </ul>
                {!showAll && added.length > LIST_PREVIEW ? (
                  <div className={styles.showAll}>
                    <Button variant="plain" onClick={() => setShowAll(true)}>
                      {`Show all ${added.length}`}
                    </Button>
                  </div>
                ) : null}
              </>
            ) : null}

            <div className={styles.spacer} />
            <div className={styles.actions}>
              <Button variant="primary" disabled={added.length === 0} onClick={seeReport}>
                See your first report
              </Button>
              <Button variant="plainDark" onClick={() => setStep(1)}>
                Back
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className={styles.card}>
            <h1 className={styles.title}>Building your first report</h1>
            {!slow ? <p className={styles.lead}>This usually takes under a minute.</p> : null}
            {live ? (
              // We don't know a catalog's size until it's read, so progress is per store.
              <ProgressBar
                label={target ? `Reading ${target.name}’s catalog` : "Reading catalogs"}
                value={done}
                max={Math.max(1, added.length)}
              />
            ) : slow ? (
              <ProgressBar label="Reading Hearth & Pine’s catalog: 410 of 1,632 products" value={410} max={1632} />
            ) : (
              <ProgressBar label="Reading Dewlane’s catalog: 250 of 313 products" value={250} max={313} />
            )}
            {slow ? (
              <>
                <Banner tone="info">Big catalogs take a minute. We&rsquo;ll email you when it&rsquo;s ready.</Banner>
                <div className={styles.actions}>
                  <Button variant="primary" href="/dashboard">
                    Go to Home
                  </Button>
                </div>
              </>
            ) : (
              <ul className={styles.progressList}>
                {(live
                  ? added
                  : [
                      { ...HP, status: "ready" as const },
                      { ...DW, status: "reading" as const },
                      OG,
                    ]
                ).map((a) => (
                  <li key={a.id}>
                    {a.status === "ready" ? (
                      <>
                        <IconCheck /> {a.name}: {a.products !== null ? `${a.products.toLocaleString("en-US")} products read` : "read"}
                      </>
                    ) : a.status === "reading" ? (
                      <>
                        <SpinnerIcon tone="#4a4a4a" /> {a.name}: reading catalog
                      </>
                    ) : a.status === "failed" ? (
                      <>
                        <IconX /> {a.name}: couldn&rsquo;t read, we&rsquo;ll try again
                      </>
                    ) : (
                      <>
                        <IconClock /> {a.name}: pages next
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}
    </PageBody>
  );
}
