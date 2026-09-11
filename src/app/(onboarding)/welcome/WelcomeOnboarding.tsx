"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { findCompetitorsAction, type FinderState } from "@/app/(marketing)/actions";
import { Button } from "@/components/Button";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";
import { PlusIcon } from "@/components/icons";
import type { FinderResult } from "@/features/competitorFinder/types";
import { seedCompetitors } from "@/features/competitors/actions";
import { normalizeUrl } from "@/features/competitors/url";
import { LIMITS, type Plan } from "@/features/plan/limits";
import { AddCompetitorDialog } from "./AddCompetitorDialog";
import { OnboardingPlanStep } from "./OnboardingPlanStep";
import { StepIndicator } from "./StepIndicator";
import styles from "./welcome.module.css";

type Row = { name: string; url: string; selected: boolean };
type Step = "watchlist" | "plan";

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

const KEY = "tw_pending_competitors";
// The company the visitor searched on the homepage finder — pre-seeds the search
// bar on the watchlist step so they can refine/expand in place.
const COMPANY_KEY = "tw_pending_company";
// Set once the visitor has been through onboarding (finished or skipped), so the
// dashboard's redirect gate doesn't send them back here on every empty-dashboard
// visit. See PendingSeedRedirect.
const ONBOARDED_KEY = "tw_onboarded";

function markOnboarded() {
  try {
    localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    /* storage disabled — worst case they see onboarding again */
  }
}

export function WelcomeOnboarding({
  plan,
  limit,
  email,
  userId,
}: {
  plan: Plan;
  limit: number;
  email: string;
  userId: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null); // null = still loading
  const [step, setStep] = useState<Step>("watchlist");
  const [company, setCompany] = useState("");
  // The last company actually searched — the pre-seeded value counts as already
  // searched, so "Find competitors" only appears once the input is changed.
  const [lastQuery, setLastQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // v3 Pro intent: "Select all & go Pro" on step 1 selects every competitor and
  // routes step 2 to the Pro-only "Check the benefits" view instead of the
  // Free/Pro choice. Cleared by "Switch back to Free".
  const [proIntent, setProIntent] = useState(false);
  const pagesPerCompetitor = LIMITS[plan].pagesPerCompetitor;

  // Same server action the homepage finder uses, so onboarding and the marketing
  // hero can't drift.
  const [finderState, finderAction, finding] = useActionState<FinderState, FormData>(
    findCompetitorsAction,
    null,
  );

  // Load the picks + company stashed on the homepage (/). No picks (a bare signup)
  // just starts with an empty list and the search bar.
  useEffect(() => {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(localStorage.getItem(KEY) ?? "null");
    } catch {
      parsed = null;
    }
    const picks: Row[] = Array.isArray(parsed)
      ? parsed
          .filter((p): p is { name?: unknown; url?: unknown } => !!p && typeof p === "object")
          .map((p, i) => ({
            name: String(p.name ?? "").trim(),
            url: normalizeUrl(String(p.url ?? "")),
            selected: i < limit, // pre-select the first `limit` — user can change
          }))
      : [];
    // localStorage is only readable client-side, so this must run in an effect
    // (a client component still SSRs, where a lazy initializer would throw).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRows(picks);
    try {
      const c = localStorage.getItem(COMPANY_KEY);
      if (c) {
        setCompany(c);
        setLastQuery(c); // pre-seeded value is "already searched" → hide the CTA
      }
    } catch {
      /* ignore */
    }
  }, [limit]);

  // When a search lands, MERGE its suggestions into the list (dedup by URL; keep
  // whatever the user has already curated). Guarded on result identity (setting
  // state during render is the React-sanctioned reset-on-input-change pattern).
  const [seededFrom, setSeededFrom] = useState<FinderResult | null>(null);
  if (finderState?.status === "ok" && finderState.result !== seededFrom) {
    setSeededFrom(finderState.result);
    setRows((prev) => {
      const cur = prev ?? [];
      const seen = new Set(cur.map((r) => normalizeUrl(r.url)));
      let selectedCount = cur.filter((r) => r.selected).length;
      const additions: Row[] = [];
      for (const c of finderState.result.competitors) {
        const url = normalizeUrl(c.url);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        const canSelect = plan !== "free" || proIntent || selectedCount < limit;
        if (canSelect) selectedCount += 1;
        additions.push({ name: c.name.trim(), url, selected: canSelect });
      }
      return [...cur, ...additions];
    });
  }

  if (rows === null) return null;

  const selectedCount = rows.filter((r) => r.selected).length;
  // On Free without Pro intent, selecting past the limit is blocked (rows show a
  // Pro badge); Pro intent unlocks everything.
  const atCap = plan === "free" && !proIntent && selectedCount >= limit;
  const selectedRows = rows.filter((r) => r.selected);
  const canContinue = selectedRows.length > 0 && selectedRows.every((r) => r.name.trim() && r.url.trim());

  // Only surface "Find competitors" when there's a new query to run (input
  // differs from the last search / pre-seeded value), while searching, or after
  // an error — mirrors the homepage finder.
  const dirty = company.trim() !== "" && company.trim() !== lastQuery;
  const showFind = finding || dirty || finderState?.status === "error";

  function toggle(i: number) {
    setRows((r) => {
      if (!r) return r;
      const row = r[i];
      // Block selecting past the plan cap (Free, no Pro intent); unselect is free.
      if (!row.selected && plan === "free" && !proIntent && r.filter((x) => x.selected).length >= limit) {
        return r;
      }
      return r.map((x, idx) => (idx === i ? { ...x, selected: !x.selected } : x));
    });
  }
  // "Select all & go Pro": watch everything, route step 2 to the Pro view.
  function selectAllPro() {
    setRows((r) => (r ? r.map((x) => ({ ...x, selected: true })) : r));
    setProIntent(true);
  }
  // "Switch back to Free": drop Pro intent and trim the selection to the free limit.
  function switchBackToFree() {
    setProIntent(false);
    setRows((r) => {
      if (!r) return r;
      let kept = 0;
      return r.map((x) => {
        if (x.selected && kept < limit) {
          kept += 1;
          return x;
        }
        return { ...x, selected: false };
      });
    });
  }
  function remove(i: number) {
    setRows((r) => (r ? r.filter((_, idx) => idx !== i) : r));
  }
  // Add a competitor from the modal: append a selected toggle row (dedup by URL,
  // respect the free cap).
  function handleAdd(c: { name: string; url: string }) {
    setRows((r) => {
      const cur = r ?? [];
      const url = normalizeUrl(c.url);
      if (!url || cur.some((x) => normalizeUrl(x.url) === url)) return cur;
      const selected = plan !== "free" || proIntent || cur.filter((x) => x.selected).length < limit;
      return [...cur, { name: c.name.trim(), url, selected }];
    });
  }
  async function start() {
    if (!rows) return;
    setBusy(true);
    setError(null);
    const payload = rows
      .filter((r) => r.selected)
      .map((r) => ({ name: r.name.trim(), url: r.url.trim() }));
    const res = await seedCompetitors(payload);
    if ("error" in res) {
      setError(res.error);
      setBusy(false);
      return;
    }
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(COMPANY_KEY);
    } catch {
      /* ignore */
    }
    markOnboarded();
    const msg =
      res.created === 1
        ? "Added 1 competitor — we captured a baseline and will email you what changes."
        : `Added ${res.created} competitors — we captured baselines and will email you what changes.`;
    router.push(`/dashboard?flash=${encodeURIComponent(msg)}`);
  }

  if (step === "plan") {
    return (
      <OnboardingPlanStep
        allRows={rows.map((r) => ({ name: r.name.trim(), url: r.url.trim() }))}
        email={email}
        userId={userId}
        busy={busy}
        proIntent={proIntent}
        onBack={() => setStep("watchlist")}
        onContinueFree={start}
      />
    );
  }

  return (
    <div className={styles.wrap}>
      {plan === "free" ? <StepIndicator step={1} label="Build your watchlist" /> : null}
      <h1 className={styles.title}>Set up your watchlist</h1>
      <p className={styles.sub}>
        We start by watching each competitor’s <strong>homepage</strong> and email you a
        plain-English digest when something changes. You can add up to {pagesPerCompetitor} page
        {pagesPerCompetitor === 1 ? "" : "s"} per competitor once you’re in.
      </p>

      {/* Same finder as the homepage — search your company to suggest competitors,
          which merge into the list below. Pre-seeded with the company they typed. */}
      <form
        action={finderAction}
        onSubmit={() => setLastQuery(company.trim())}
        className={styles.domainForm}
      >
        <label htmlFor="company" className={styles.domainLabel}>
          Your company website
        </label>
        <div className={styles.domainRow}>
          <input
            id="company"
            name="company"
            type="text"
            className={styles.domainInput}
            placeholder="yourcompany.com"
            autoComplete="off"
            inputMode="url"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            aria-label="Your company name or website"
          />
          {showFind ? (
            <Button type="submit" disabled={finding}>
              {finding ? "Finding…" : "Find competitors"}
            </Button>
          ) : null}
        </div>
        {finderState?.status === "error" ? (
          <p className={styles.error}>{finderState.message}</p>
        ) : showFind ? (
          <p className={styles.domainHint}>
            {finding
              ? "Reading your site and finding who to watch — a few seconds."
              : "We’ll suggest competitors and add them to your list."}
          </p>
        ) : null}
      </form>

      <p className={styles.pickNote}>
        {plan !== "free"
          ? `${selectedCount} selected.`
          : proIntent
            ? `${selectedCount} selected · Pro`
            : `${selectedCount} of ${limit} selected on Free`}
      </p>

      <div className={styles.list}>
        {rows.length === 0 ? (
          <p className={styles.emptyHint}>
            Search above, or add a competitor yourself, to get started.
          </p>
        ) : (
          rows.map((row, i) => {
            // Every row is a v3 toggle row — tap anywhere to select/deselect.
            const locked = plan === "free" && !row.selected && atCap;
            return (
              <div
                key={i}
                className={row.selected ? `${styles.pickRow} ${styles.pickRowOn}` : styles.pickRow}
                role="button"
                tabIndex={0}
                aria-pressed={row.selected}
                onClick={() => toggle(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(i);
                  }
                }}
              >
                <div className={styles.pickMain}>
                  <CompetitorAvatar url={row.url} name={row.name} className={styles.pickAvatar} />
                  <div className={styles.pickTextWrap}>
                    <div className={styles.pickName}>{row.name || "Untitled"}</div>
                    <div className={styles.pickDomain}>{domainOf(row.url)}</div>
                  </div>
                </div>
                <div className={styles.pickRight}>
                  {locked ? <span className={styles.proBadge}>Pro</span> : null}
                  <button
                    type="button"
                    className={styles.pickRemove}
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(i);
                    }}
                    aria-label={`Remove ${row.name || "competitor"}`}
                  >
                    &times;
                  </button>
                  <span className={row.selected ? `${styles.checkBox} ${styles.checkBoxOn}` : styles.checkBox}>
                    {row.selected ? "✓" : ""}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <button type="button" className={styles.addRow} onClick={() => setAddOpen(true)} disabled={busy}>
        <PlusIcon size={12} />
        Add one yourself instead
      </button>

      {plan === "free" && proIntent && (
        <div className={styles.proSelected}>
          <div className={styles.proSelectedText}>
            <strong>Pro selected</strong> &middot; watching all {selectedCount}
          </div>
          <button type="button" className={styles.switchBack} onClick={switchBackToFree} disabled={busy}>
            Switch back to Free
          </button>
        </div>
      )}

      {plan === "free" && !proIntent && selectedCount >= limit && (
        <div className={styles.upgradeNudge}>
          <div>
            <div className={styles.upgradeNudgeTitle}>Want to watch more than {limit}?</div>
            <div className={styles.upgradeNudgeBody}>
              Free watches {limit}. Go Pro to track up to {LIMITS.paid.competitors} — checkout
              happens right here, no redirect.
            </div>
          </div>
          <Button type="button" onClick={selectAllPro} disabled={busy}>
            Select all &amp; go Pro
          </Button>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <Button
          type="button"
          // Pro: "Start watching" is the only (finalizing) action → primary. Free:
          // "Continue" is secondary unless they've committed to Pro (proIntent).
          variant={plan !== "free" || proIntent ? "primary" : "secondary"}
          // Existing Pro users have no plan to choose — seed their picks and go
          // straight to the dashboard, skipping the Free/Pro step entirely.
          onClick={() => (plan === "free" ? setStep("plan") : void start())}
          disabled={!canContinue || busy}
        >
          {plan !== "free"
            ? busy
              ? "Setting up…"
              : "Start watching"
            : proIntent
              ? "Upgrade to Pro to continue"
              : "Continue"}
        </Button>
      </div>

      {addOpen ? (
        <AddCompetitorDialog onAdd={handleAdd} onClose={() => setAddOpen(false)} />
      ) : null}
    </div>
  );
}
