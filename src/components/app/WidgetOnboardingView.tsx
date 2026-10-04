"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, Thumbnail } from "@/components/ui/Avatar";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Stepper } from "@/components/ui/Guides";
import { IconCheck, IconDoc, IconMessage, IconPackage, IconPlus, IconTag, IconX, SpinnerIcon } from "@/components/ui/icons";
import { PageBody } from "@/components/ui/Page";
import { TextField } from "@/components/ui/TextField";
import { addCompetitor, finishWidgetOnboarding, removeCompetitor, saveOwnStore, suggestCompetitors } from "@/features/appData/actions";
import { money, shortDate } from "@/features/appData/format";
import type { WidgetOnboarding } from "@/features/appData/queries";
import type { ReportList } from "@/features/appData/types";
import type { Suggestion } from "@/features/competitorFinder/suggest";
import { sameStore } from "@/features/preview/claimPath";
import type { BetaStatus } from "@/features/appData/types";
import { BetaNote } from "./BetaParts";
import styles from "./WidgetOnboardingView.module.css";

// Onboarding for a visitor who came from the homepage widget (DESIGN
// 10-onboard): their competitor's full snapshot first, then their own store,
// more competitors, done. Direct sign-ups keep WelcomeView.

export type WidgetStep = "snapshot" | "store" | "competitors" | "done";
const STEPS = ["Snapshot", "Your store", "Competitors", "Done"];
const INDEX: Record<WidgetStep, number> = { snapshot: 0, store: 1, competitors: 2, done: 3 };
const SHOWN = 5;

const host = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];

function List({ list, kind }: { list: ReportList; kind: "launched" | "sale" | "soldout" }) {
  const [all, setAll] = useState(false);
  const items = all ? list.items : list.items.slice(0, SHOWN);
  return (
    <>
      <ul className={styles.items}>
        {items.map((i) => (
          <li key={i.id} className={styles.item}>
            <Thumbnail src={i.image} size={40} />
            <div className={styles.itemText}>
              <span className={styles.itemTitle}>{i.title}</span>
              {kind === "launched" && i.date ? <span className={styles.itemSub}>Launched {shortDate(i.date)}</span> : null}
            </div>
            <span className={styles.itemPrice}>
              {kind === "soldout" ? (
                <span className={styles.muted}>Sold out</span>
              ) : kind === "sale" && i.compareAtPrice ? (
                <>
                  <span className={styles.was}>{money(i.compareAtPrice)}</span>
                  <span className={styles.now}>{money(i.price)}</span>
                  {i.pctOff ? <span className={styles.off}>−{i.pctOff}%</span> : null}
                </>
              ) : (
                money(i.price)
              )}
            </span>
          </li>
        ))}
      </ul>
      {!all && list.items.length > SHOWN ? (
        <div className={styles.seeAll}>
          <Button variant="plain" onClick={() => setAll(true)}>{`See all ${list.total.toLocaleString("en-US")}`}</Button>
        </div>
      ) : null}
    </>
  );
}

function Snapshot({ data, next }: { data: WidgetOnboarding; next: () => void }) {
  const c = data.competitor!;
  const first = data.first;
  const report = first?.report ?? null;
  const watching = (
    <Banner tone="success">We&rsquo;re now watching {c.name}. You&rsquo;ll get an alert when they make a big move.</Banner>
  );
  const head = (sub: string) => (
    <div className={styles.snapHead}>
      <Avatar name={c.name} size={36} domain={c.domain} />
      <div>
        <h1 className={styles.title}>Here&rsquo;s everything we found on {c.name}.</h1>
        <p className={styles.sub}>{sub}</p>
      </div>
    </div>
  );
  const cont = (
    <div className={styles.actionsEnd}>
      <Button variant="primary" onClick={next}>
        Continue
      </Button>
    </div>
  );

  if (first?.reading || !report) {
    return (
      <div className={styles.stack}>
        {head(`${c.domain} · reading their catalog`)}
        <Card>
          <p className={styles.reading}>
            <SpinnerIcon size={16} tone="#4a4a4a" /> Reading {c.name}&rsquo;s catalog. Big stores take a minute; this page fills in on its own.
          </p>
        </Card>
        {watching}
        {cont}
      </div>
    );
  }

  // 1b: no catalog to read, so the pages we watch instead.
  if (report.competitor.platform === "other" || report.stats.products === null) {
    return (
      <div className={styles.stack}>
        {head(`${c.domain} · read just now`)}
        <Banner tone="info">
          We&rsquo;ll watch {c.name}&rsquo;s homepage, sale page and policies. Catalog details aren&rsquo;t available for this store.
        </Banner>
        <Card title="Pages we’ll watch" titleId="pages">
          <ul className={styles.pages}>
            {report.pages.map((p) => (
              <li key={p.url} className={styles.page}>
                <IconDoc />
                <span className={styles.pageLabel}>{p.label}</span>
                <span className={styles.muted}>Read just now</span>
              </li>
            ))}
          </ul>
        </Card>
        {watching}
        {cont}
      </div>
    );
  }

  const s = report.stats;
  const pcts = report.onSale.items.map((i) => i.pctOff ?? 0).filter((p) => p > 0);
  const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  const max = pcts.length ? Math.max(...pcts) : null;
  const products = s.products === null ? "" : ` · ${s.productsCapped ? `${s.products.toLocaleString("en-US")}+` : s.products.toLocaleString("en-US")} products`;
  const count = (n: number) => `${n.toLocaleString("en-US")} ${n === 1 ? "product" : "products"}`;

  return (
    <div className={styles.stack}>
      {head(`${c.domain}${products} · read just now`)}
      {watching}
      <Card title="New in the last 30 days" titleId="launched" action={<span className={styles.muted}>{count(report.recentlyLaunched.total)}</span>}>
        {report.recentlyLaunched.total ? <List list={report.recentlyLaunched} kind="launched" /> : <p className={styles.empty}>No launches in the last 30 days.</p>}
      </Card>
      <Card title="On sale right now" titleId="sale">
        {report.onSale.total ? (
          <>
            <dl className={styles.stats}>
              <div>
                <dt>On sale</dt>
                <dd>{report.onSale.total.toLocaleString("en-US")}</dd>
              </div>
              <div>
                <dt>Average discount</dt>
                <dd>{avg === null ? "—" : `${avg}%`}</dd>
              </div>
              <div>
                <dt>Biggest discount</dt>
                <dd>{max === null ? "—" : `${max}%`}</dd>
              </div>
            </dl>
            <h3 className={styles.subhead}>Top {Math.min(SHOWN, report.onSale.items.length)} discounts</h3>
            <List list={{ ...report.onSale, items: [...report.onSale.items].sort((a, b) => (b.pctOff ?? 0) - (a.pctOff ?? 0)) }} kind="sale" />
          </>
        ) : (
          <p className={styles.empty}>Nothing on sale right now.</p>
        )}
      </Card>
      <Card title="Sold out right now" titleId="soldout" action={<span className={styles.muted}>{count(report.soldOut.total)}</span>}>
        {report.soldOut.total ? <List list={report.soldOut} kind="soldout" /> : <p className={styles.empty}>Nothing sold out right now.</p>}
      </Card>
      {cont}
    </div>
  );
}

function YourStore({
  data,
  next,
  back,
  demoSameDomain,
}: {
  data: WidgetOnboarding;
  next: (competitorGone?: boolean) => void;
  /** Absent when there's no snapshot to go back to. */
  back?: () => void;
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
          {back ? (
            <Button variant="plainDark" onClick={back}>
              Back
            </Button>
          ) : null}
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
              {c ? `${c.name} is already added. ` : ""}Pick stores you also compete with.
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

function Done({ data, back, demo, beta }: { data: WidgetOnboarding; back: () => void; demo?: boolean; beta?: BetaStatus | null }) {
  useEffect(() => {
    if (!demo) void finishWidgetOnboarding();
  }, [demo]);
  const when = data.nextBriefing
    ? new Date(data.nextBriefing).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
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
      {step === "snapshot" && data.competitor ? (
        <Snapshot data={data} next={() => go("store")} />
      ) : step === "store" ? (
        <YourStore
          data={data}
          next={(gone) => go("competitors", gone)}
          back={data.competitor ? () => go("snapshot") : undefined}
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

