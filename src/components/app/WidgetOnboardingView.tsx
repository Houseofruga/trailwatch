"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, Thumbnail } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Stepper } from "@/components/ui/Guides";
import { IconCheck, IconMessage, IconPackage, IconPlus, IconTag, IconX, SpinnerIcon } from "@/components/ui/icons";
import { PageBody } from "@/components/ui/Page";
import { TextField } from "@/components/ui/TextField";
import { addCompetitor, finishWidgetOnboarding, removeCompetitor, saveOwnStore, suggestCompetitors } from "@/features/appData/actions";
import { money } from "@/features/appData/format";
import type { WidgetOnboarding } from "@/features/appData/queries";
import type { Suggestion } from "@/features/competitorFinder/suggest";
import { sameStore } from "@/features/preview/claimPath";
import type { BetaStatus } from "@/features/appData/types";
import { BetaNote } from "./BetaParts";
import styles from "./WidgetOnboardingView.module.css";

// Onboarding for a visitor who came from the homepage widget (DESIGN
// 10-onboard, minus its snapshot step since 2026-10-04): their own store first,
// then more competitors (the one they looked up is already added), done.
// Direct sign-ups keep WelcomeView.

export type WidgetStep = "store" | "competitors" | "done";
const STEPS = ["Your store", "Competitors", "Done"];
const INDEX: Record<WidgetStep, number> = { store: 0, competitors: 1, done: 2 };

const host = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];

function YourStore({
  data,
  next,
  demoSameDomain,
}: {
  data: WidgetOnboarding;
  next: (competitorGone?: boolean) => void;
  demoSameDomain?: boolean;
}) {
  const c = data.competitor;
  const [value, setValue] = useState(demoSameDomain && c ? c.domain : (data.ownStore?.domain ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [askMine, setAskMine] = useState(!!demoSameDomain);
  // A real product of theirs, to show what comparing unlocks.
  const example = data.first?.report?.onSale.items[0] ?? data.first?.report?.recentlyLaunched.items[0] ?? null;

  async function save(domain: string) {
    setBusy(true);
    const res = await saveOwnStore(domain);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    next();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return setError("Enter your store’s website, like yourstore.com.");
    setError(null);
    // The store they just added as a competitor: ask which it is.
    if (c && sameStore(value, c.domain)) return setAskMine(true);
    void save(value);
  }

  async function itsMine() {
    if (!c) return;
    setBusy(true);
    await removeCompetitor(c.id);
    const res = await saveOwnStore(c.domain);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    next(true);
  }

  return (
    <Card>
      <form className={styles.cardStack} onSubmit={submit} noValidate>
        <div>
          <h1 className={styles.title}>Compare with your store</h1>
          <p className={styles.sub}>Add your store so we can compare prices and spot products you&rsquo;re missing.</p>
        </div>
        <TextField
          id="own-store"
          label="Your store’s website"
          prefix="https://"
          placeholder="yourstore.com"
          inputMode="url"
          autoComplete="off"
          value={value}
          error={error}
          onChange={(e) => {
            setValue(e.target.value);
            setAskMine(false);
          }}
        />
        {askMine && c ? (
          <div role="group" aria-labelledby="same-q" className={styles.ask}>
            <p id="same-q" className={styles.askTitle}>
              Is this your store?
            </p>
            <p className={styles.askText}>You just added {c.domain} as a competitor.</p>
            <div className={styles.actions}>
              <Button onClick={() => void itsMine()} loading={busy}>
                Yes, it&rsquo;s mine
              </Button>
              <Button
                onClick={() => {
                  setAskMine(false);
                  setValue("");
                }}
              >
                No, it&rsquo;s a competitor
              </Button>
            </div>
          </div>
        ) : example ? (
          <div className={styles.unlocks}>
            <span className={styles.unlocksLabel}>What this unlocks</span>
            <div className={styles.unlocksRow}>
              <Thumbnail src={example.image} size={40} />
              <div className={styles.itemText}>
                <span className={styles.itemTitle}>
                  Their {example.title} is {money(example.price)}.
                </span>
                <span className={styles.itemSub}>We&rsquo;ll flag price gaps like this and products they sell that you don&rsquo;t.</span>
              </div>
            </div>
          </div>
        ) : null}
        <div className={styles.actions}>
          <Button variant="primary" type="submit" loading={busy && !askMine} disabled={askMine}>
            Add my store
          </Button>
        </div>
      </form>
    </Card>
  );
}

type Pick = Suggestion & { on: boolean };

function Competitors({ data, next, back, demo }: { data: WidgetOnboarding; next: () => void; back: () => void; demo?: Suggestion[] }) {
  const router = useRouter();
  const c = data.competitor;
  const [picks, setPicks] = useState<Pick[] | null>(demo ? demo.map((s, i) => ({ ...s, on: i === 0 })) : null);
  const [message, setMessage] = useState<string | null>(null);
  const [extra, setExtra] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (demo) return;
    void suggestCompetitors({ basis: c?.domain }).then((res) => {
      if (res.ok) setPicks(res.suggestions.map((s) => ({ ...s, on: false })));
      else {
        setPicks([]);
        if (res.reason !== "no-store") setMessage(res.message);
      }
    });
  }, [c?.domain, demo]);

  const already = data.added.length;
  const chosen = (picks ?? []).filter((p) => p.on).length + extra.length;
  const total = already + chosen;
  const full = total >= data.limit;

  function toggle(domain: string) {
    setPicks((list) => (list ?? []).map((p) => (p.domain === domain ? (p.on || !full ? { ...p, on: !p.on } : p) : p)));
  }

  function addExtra(e: React.FormEvent) {
    e.preventDefault();
    const d = host(value);
    if (!/\.[a-z]{2,}$/.test(d)) return setError("Enter a store like dewlane.com.");
    if (full) return setError(`That’s the ${data.limit}-store beta limit.`);
    if (extra.includes(d) || data.added.some((a) => a.domain === d)) return setError("You’ve already added that store.");
    setError(null);
    setExtra((x) => [...x, d]);
    setValue("");
  }

  async function start() {
    setBusy(true);
    const domains = [...(picks ?? []).filter((p) => p.on).map((p) => p.domain), ...extra];
    const failed: string[] = [];
    for (const d of domains) {
      const res = await addCompetitor(d);
      if (!res.ok && !/already added/i.test(res.error)) failed.push(`${d}: ${res.error}`);
    }
    setBusy(false);
    if (failed.length) {
      setError(failed.join(" "));
      router.refresh();
      return;
    }
    next();
  }

  const own = data.ownStore;
  return (
    <div className={styles.stack}>
      {own ? (
        <Banner tone="info">
          {own.products === null ? (
            <>Reading your catalog… We&rsquo;ll compare it with your competitors as soon as it&rsquo;s in.</>
          ) : (
            <>
              Your store: {own.domain} · {own.products.toLocaleString("en-US")} products
            </>
          )}
        </Banner>
      ) : null}
      <Card>
        <div className={styles.cardStack}>
          <div>
            <h1 className={styles.title}>Who else do you compete with?</h1>
            <p className={styles.sub}>
              Pick other stores you also compete with.
            </p>
          </div>
          <p className={styles.count}>
            {total} of {data.limit} competitors added
          </p>
          {full ? (
            <Banner tone="info" title={`You’ve added ${data.limit} of ${data.limit} competitors`}>
              That&rsquo;s the beta limit. Unselect one to pick a different store.
            </Banner>
          ) : null}
          {data.added.length ? (
            <div>
              <h2 className={styles.subhead}>Already added</h2>
              <ul className={styles.items}>
                {data.added.map((a) => (
                  <li key={a.id} className={styles.item}>
                    <Avatar name={a.name} size={32} domain={a.domain} />
                    <span className={styles.itemText}>
                      <span className={styles.itemTitle}>{a.name}</span>
                      <span className={styles.itemSub}>{a.domain}</span>
                    </span>
                    {a.status === "reading" ? (
                      <Badge tone="info" spinner>
                        Reading catalog…
                      </Badge>
                    ) : a.status === "pages" ? (
                      <Badge>Pages only</Badge>
                    ) : a.status === "failed" ? (
                      <Badge tone="critical">Couldn&rsquo;t read</Badge>
                    ) : (
                      <Badge tone="success">Tracking</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <h2 className={styles.subhead}>Suggested stores</h2>
          {picks === null ? (
            <p className={styles.reading}>
              <SpinnerIcon size={16} tone="#4a4a4a" /> Finding stores like {c?.name ?? "yours"}. This takes a few seconds.
            </p>
          ) : picks.length === 0 ? (
            <p className={styles.empty}>{message ?? "No suggestions yet. Add the stores you know below."}</p>
          ) : (
            <ul className={styles.picks}>
              {picks.map((p) => (
                <li key={p.domain}>
                  <button
                    type="button"
                    className={`${styles.pick} ${p.on ? styles.pickOn : ""}`}
                    aria-pressed={p.on}
                    disabled={!p.on && full}
                    onClick={() => toggle(p.domain)}
                  >
                    <Avatar name={p.name} size={32} domain={p.domain} />
                    <span className={styles.itemText}>
                      <span className={styles.itemTitle}>
                        {p.name} <span className={styles.muted}>{p.domain}</span>
                      </span>
                      {p.why ? <span className={styles.itemSub}>{p.why}</span> : null}
                    </span>
                    <span className={styles.tick} aria-hidden="true">
                      {p.on ? <IconCheck size={12} /> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={addExtra} noValidate>
            <TextField
              id="add-store"
              label="Add any store"
              prefix="https://"
              placeholder="dewlane.com"
              inputMode="url"
              autoComplete="off"
              value={value}
              error={error}
              disabled={full}
              onChange={(e) => setValue(e.target.value)}
              trailing={
                <Button type="submit" disabled={full} icon={<IconPlus />}>
                  Add
                </Button>
              }
            />
          </form>
          {extra.length ? (
            <p className={styles.alsoAdded}>
              Also added:{" "}
              {extra.map((d) => (
                <span key={d} className={styles.chip}>
                  {d}
                  <button type="button" aria-label={`Remove ${d}`} onClick={() => setExtra((x) => x.filter((y) => y !== d))}>
                    <IconX size={12} />
                  </button>
                </span>
              ))}
            </p>
          ) : null}
          <div className={styles.actions}>
            <Button variant="primary" loading={busy} onClick={() => void start()}>
              Start tracking
            </Button>
            <Button variant="plainDark" onClick={back}>
              Back
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** The last step of both onboardings (DESIGN 10-onboard 4, 12-Beta 12d). */
export function AllSetCard({ nextBriefing, back, beta }: { nextBriefing: string | null; back: () => void; beta?: BetaStatus | null }) {
  const when = nextBriefing
    ? new Date(nextBriefing).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
    : null;
  return (
    <Card>
      <div className={styles.cardStack}>
        <div>
          <h1 className={styles.title}>You&rsquo;re all set.</h1>
          {when ? <p className={styles.sub}>Your first Monday briefing arrives on {when}.</p> : null}
        </div>
        <div>
          <h2 className={styles.subhead}>What to expect</h2>
          <ul className={styles.expect}>
            <li>
              <IconTag /> Instant alerts for big moves: a sale starting, a bestseller selling out, a new launch.
            </li>
            <li>
              <IconMessage /> A plain-English briefing every Monday with what changed and what to do.
            </li>
            <li>
              <IconPackage /> Everything else in your Home timeline, any time.
            </li>
          </ul>
        </div>
        {beta ? <BetaNote beta={beta} /> : null}
        <div className={styles.actions}>
          <Button variant="primary" href="/dashboard">
            Go to Home
          </Button>
          <Button variant="plainDark" onClick={back}>
            Back
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Done({ data, back, demo, beta }: { data: WidgetOnboarding; back: () => void; demo?: boolean; beta?: BetaStatus | null }) {
  useEffect(() => {
    if (!demo) void finishWidgetOnboarding();
  }, [demo]);
  return <AllSetCard nextBriefing={data.nextBriefing} back={back} beta={beta} />;
}

export function WidgetOnboardingView({
  step,
  data,
  demoSameDomain,
  demoSuggestions,
  beta,
}: {
  step: WidgetStep;
  data: WidgetOnboarding;
  /** Beta-member note on the Done step (DESIGN 12-Beta 12d). */
  beta?: BetaStatus | null;
  /** Design review only: open "Is this your store?" (10-onboard 2b). */
  demoSameDomain?: boolean;
  /** Design review only: suggestions without calling the finder. */
  demoSuggestions?: Suggestion[];
}) {
  const router = useRouter();
  const go = (to: WidgetStep, competitorGone = false) => {
    const qs = new URLSearchParams({ step: to });
    if (data.competitor && !competitorGone) qs.set("c", data.competitor.id);
    router.push(`/welcome/widget?${qs}`);
  };
  return (
    <PageBody narrow>
      <Stepper steps={STEPS} current={INDEX[step]} />
      {step === "store" ? (
        <YourStore
          data={data}
          next={(gone) => go("competitors", gone)}
          demoSameDomain={demoSameDomain}
        />
      ) : step === "competitors" ? (
        <Competitors data={data} next={() => go("done")} back={() => go("store")} demo={demoSuggestions} />
      ) : (
        <Done data={data} back={() => go("competitors")} demo={!!demoSuggestions} beta={beta} />
      )}
    </PageBody>
  );
}

