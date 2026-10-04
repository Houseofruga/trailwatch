"use client";

import { useEffect, useRef, useState } from "react";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";
import { Button } from "@/components/ui/Button";
import { IconAlert, IconBan, IconCheck, IconImage, IconInfo, IconPackage, IconTag, IconTrendDown, SpinnerIcon } from "@/components/ui/icons";
import type { Finding, FindingExample, Teaser } from "@/features/preview/compute";
import type { PreviewResponse } from "@/features/preview/run";
import styles from "./home.module.css";
import s from "./lookup.module.css";

// "Try it on a competitor" (DESIGN 09-widget): a competitor's store in, real
// findings from its public catalog out, and "Join the beta" to see the rest.
// Lives inside the hero's existing card (.finder) so the page keeps its look.

const POLL_MS = 1500;
const POLL_FOR_MS = 60_000;
// Survives the sign-up round trip (email confirmation, OAuth) on this browser.
export const PENDING_PREVIEW = "tw_pending_preview";

type View =
  | { kind: "empty" }
  | { kind: "loading"; domain: string; startedAt: number }
  | { kind: "done"; domain: string; res: PreviewResponse };

const money = (cents: number | null | undefined) => (cents == null ? "" : `$${(cents / 100).toFixed(2)}`);
const LOOKS_LIKE_DOMAIN = /^(https?:\/\/)?[^\s/]+\.[a-z]{2,}(\/.*)?$/i;

const ICON: Record<Finding["kind"], React.ReactNode> = {
  launched: <IconPackage />,
  on_sale: <IconTag />,
  sold_out: <IconBan />,
};

function Example({ kind, ex }: { kind: Finding["kind"]; ex: FindingExample }) {
  return (
    <div className={s.example}>
      <span className={s.thumb} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- the store's own product image */}
        {ex.image ? <img src={ex.image} alt="" loading="lazy" /> : <IconImage />}
      </span>
      <div className={s.exampleText}>
        {kind === "launched" ? <span className={s.exampleLabel}>Newest</span> : null}
        <span className={s.exampleTitle}>{ex.title}</span>
      </div>
      <span className={s.price}>
        {kind === "sold_out" ? (
          <span className={s.muted}>Sold out</span>
        ) : kind === "on_sale" && ex.compareAtPrice ? (
          <>
            <span className={s.was}>{money(ex.compareAtPrice)}</span>
            <span className={s.now}>{money(ex.price)}</span>
          </>
        ) : (
          money(ex.price)
        )}
      </span>
    </div>
  );
}

/** "No launches in the last 30 days, and nothing on sale right now." for the empty groups. */
function missingNote(findings: Finding[]): string | null {
  const has = new Set(findings.map((f) => f.kind));
  const parts = [
    has.has("launched") ? null : "no launches in the last 30 days",
    has.has("on_sale") ? null : "nothing on sale right now",
    has.has("sold_out") ? null : "nothing sold out right now",
  ].filter((p): p is string => p !== null);
  if (parts.length === 0) return null;
  const text = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

function StoreHeader({ name, domain, count }: { name: string; domain: string; count?: string }) {
  return (
    <div className={s.store}>
      <CompetitorAvatar url={domain} name={name} className={styles.compFavicon} />
      <div className={s.storeText}>
        <span className={s.storeName}>{name}</span>
        {name !== domain ? <span className={s.storeDomain}>{domain}</span> : null}
      </div>
      {count ? <span className={s.count}>{count}</span> : null}
    </div>
  );
}

function Message({ icon, children, action }: { icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className={s.message}>
      <span className={s.messageIcon}>{icon}</span>
      <div className={s.messageBody}>
        <span>{children}</span>
        {action}
      </div>
    </div>
  );
}

const STEPS = ["Finding the store", "Reading their catalog…", "Checking launches, sales and sold-out items"];

function Loading({ domain, startedAt }: { domain: string; startedAt: number }) {
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 400);
    return () => clearInterval(t);
  }, []);
  const elapsed = now - startedAt;
  // Steps follow the usual timing of a read; the bar eases toward 90% until the answer lands.
  const active = elapsed < 1500 ? 0 : elapsed < 5000 ? 1 : 2;
  const pct = Math.round(90 * (1 - Math.exp(-elapsed / 6000)));
  return (
    <div className={s.zone}>
      <StoreHeader name={domain} domain={domain} />
      <div className={s.bar} role="progressbar" aria-label={`Reading ${domain}`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={s.barFill} style={{ width: `${pct}%` }} />
      </div>
      <ul className={s.steps}>
        {STEPS.map((label, i) => (
          <li key={label} className={`${s.step} ${i < active ? s.stepDone : i === active ? s.stepActive : ""}`}>
            {i < active ? (
              <span className={s.check}>
                <IconCheck size={11} />
              </span>
            ) : i === active ? (
              <SpinnerIcon size={18} tone="#303030" />
            ) : (
              <span className={s.dot} />
            )}
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function signupHref(previewId?: string, domain?: string) {
  const qs = new URLSearchParams({ mode: "signup", src: "widget" });
  if (previewId) qs.set("preview", previewId);
  if (domain) qs.set("domain", domain);
  return `/login?${qs}`;
}

function Results({ teaser, previewId, onJoin }: { teaser: Teaser; previewId?: string; onJoin: () => void }) {
  const count = `${teaser.complete ? teaser.productCount.toLocaleString("en-US") : "1,000+"} products found`;
  const note = missingNote(teaser.findings);
  return (
    <div className={s.zone}>
      <StoreHeader name={teaser.name} domain={teaser.domain} count={count} />
      {teaser.findings.length > 0 ? (
        <ul className={s.findings}>
          {teaser.findings.map((f) => (
            <li key={f.kind} className={s.finding}>
              <span className={s.findingIcon}>{ICON[f.kind]}</span>
              <div className={s.findingBody}>
                <p className={s.findingText}>{f.text}</p>
                {f.example ? <Example kind={f.kind} ex={f.example} /> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {note ? (
        <p className={s.note}>
          <IconInfo size={15} />
          {note}
        </p>
      ) : null}
      <div className={s.gate}>
        {teaser.priceChanges ? (
          <ul className={`${s.findings} ${s.locked}`} aria-hidden="true">
            <li className={s.finding}>
              <span className={s.findingIcon}>
                <IconTrendDown />
              </span>
              <div className={s.findingBody}>
                <p className={s.findingText}>
                  Changed {teaser.priceChanges.count} {teaser.priceChanges.count === 1 ? "price" : "prices"} in the last 30 days
                </p>
                {teaser.priceChanges.example ? (
                  <div className={s.example}>
                    <span className={s.thumb}>
                      <IconImage />
                    </span>
                    <div className={s.exampleText}>
                      <span className={s.exampleTitle}>{teaser.priceChanges.example.title}</span>
                    </div>
                    <span className={s.price}>
                      <span className={s.was}>{money(teaser.priceChanges.example.oldPrice)}</span>
                      <span className={s.now}>{money(teaser.priceChanges.example.newPrice)}</span>
                    </span>
                  </div>
                ) : null}
              </div>
            </li>
          </ul>
        ) : null}
        <p className={s.gateText}>See the full snapshot, and get an alert the moment they start their next sale.</p>
        <p className={s.gateNote}>Free during beta · No card required</p>
        <Button variant="primary" tall full href={signupHref(previewId, teaser.domain)} onClick={onJoin}>
          Join the beta
        </Button>
      </div>
    </div>
  );
}

export function CompetitorLookup() {
  const [value, setValue] = useState("");
  const [view, setView] = useState<View>({ kind: "empty" });
  const [fieldError, setFieldError] = useState<string | null>(null);
  const run = useRef(0);

  async function lookup(domain: string) {
    const id = ++run.current;
    setFieldError(null);
    setView({ kind: "loading", domain, startedAt: Date.now() });
    let res: PreviewResponse;
    try {
      const r = await fetch("/api/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      res = (await r.json()) as PreviewResponse;
      // A big catalog finishes in the background: poll its preview id.
      const until = Date.now() + POLL_FOR_MS;
      while (res.status === "processing" && res.previewId && Date.now() < until) {
        await new Promise((ok) => setTimeout(ok, POLL_MS));
        if (id !== run.current) return;
        const p = await fetch(`/api/preview/${res.previewId}`);
        res = p.ok ? ((await p.json()) as PreviewResponse) : { status: "error" };
      }
      if (res.status === "processing") res = { status: "error" };
    } catch {
      res = { status: "error" };
    }
    if (id !== run.current) return;
    if (res.status === "invalid_domain") {
      setFieldError(res.message ?? "Enter a store address like fernwoodsupply.com.");
      setView({ kind: "empty" });
      return;
    }
    setView({ kind: "done", domain: res.domain ?? domain, res });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!LOOKS_LIKE_DOMAIN.test(v)) {
      setFieldError("Enter a store address like fernwoodsupply.com.");
      return;
    }
    void lookup(v);
  }

  // Remember the preview so sign-up can open it, and count the click.
  function join(previewId?: string, domain?: string) {
    try {
      localStorage.setItem(PENDING_PREVIEW, JSON.stringify({ previewId: previewId ?? null, domain: domain ?? null }));
    } catch {
      /* private mode: the ?preview= link still carries it */
    }
    if (previewId) navigator.sendBeacon?.(`/api/preview/${previewId}`);
  }

  const loading = view.kind === "loading";
  const done = view.kind === "done" ? view : null;
  const res = done?.res;

  return (
    <section className={styles.finder} aria-labelledby="lookup-title">
      <h2 id="lookup-title" className={s.title}>
        Try it on a competitor
      </h2>
      <form onSubmit={submit} noValidate>
        <label htmlFor="lookup-site" className={styles.finderLabel}>
          A competitor’s store
        </label>
        <div className={`${styles.finderRow} ${s.row}`}>
          <input
            id="lookup-site"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="competitorstore.com"
            className={styles.finderInput}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? "lookup-error" : "lookup-help"}
          />
          <Button variant="primary" tall type="submit" loading={loading}>
            See their moves
          </Button>
        </div>
        {fieldError ? (
          <p id="lookup-error" className={s.fieldError}>
            <IconAlert size={15} />
            {fieldError}
          </p>
        ) : null}
        <p id="lookup-help" className={styles.finderHint}>
          Works instantly with Shopify stores. Nothing to install.
        </p>
      </form>

      {/* Same reserved zone as before, so the hero keeps its height. */}
      <div className={styles.resultZone} role="status" aria-live="polite">
        {view.kind === "empty" ? (
          <div className={styles.emptyState}>Their launches, sales and sold-out products will appear here.</div>
        ) : view.kind === "loading" ? (
          <Loading domain={view.domain} startedAt={view.startedAt} />
        ) : res?.status === "ready" && res.teaser ? (
          <Results teaser={res.teaser} previewId={res.previewId} onJoin={() => join(res.previewId, res.domain)} />
        ) : res?.status === "instant_not_supported" ? (
          <div className={s.zone}>
            <StoreHeader name={done!.domain} domain={done!.domain} />
            <Message
              icon={<IconInfo />}
              action={
                <Button variant="primary" tall href={signupHref(res.previewId, res.domain)} onClick={() => join(res.previewId, res.domain)}>
                  Join the beta
                </Button>
              }
            >
              {res.reason === "catalog_hidden"
                ? "We can’t read this store’s catalog instantly. Join the beta and we’ll track its key pages instead."
                : `We can’t read this store’s catalog instantly: ${done!.domain} isn’t on Shopify, and Trailwatch tracks Shopify stores.`}
            </Message>
          </div>
        ) : res?.status === "marketplace_blocked" ? (
          <Message icon={<IconInfo />}>Add the brand’s own website instead; marketplace tracking is coming soon.</Message>
        ) : res?.status === "rate_limited" ? (
          <Message
            icon={<IconInfo />}
            action={
              res.reason === "per_ip_gap" ? null : (
                <Button variant="primary" tall href={signupHref()} onClick={() => join(undefined, res.domain)}>
                  Join the beta
                </Button>
              )
            }
          >
            {res.reason === "per_ip_gap"
              ? "One moment: try again in a few seconds."
              : res.reason === "global"
                ? res.message
                : "You’ve tried a few stores today. Join the beta to track as many as your plan allows."}
          </Message>
        ) : (
          <Message
            icon={<IconAlert />}
            action={
              <Button tall onClick={() => void lookup(done?.domain ?? value.trim())}>
                Try again
              </Button>
            }
          >
            Something went wrong on our side while reading {done?.domain ?? "that store"}. It’s usually fine on a second try.
          </Message>
        )}
      </div>
    </section>
  );
}
