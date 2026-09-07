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
import { OnboardingPlanStep } from "./OnboardingPlanStep";
import { StepIndicator } from "./StepIndicator";
import styles from "./welcome.module.css";

// `editing` rows are blank/manual entries shown as name+URL inputs; suggested
// rows (from the homepage finder or the domain step) render as v3 toggle rows.
type Row = { name: string; url: string; selected: boolean; editing?: boolean };
type Step = "domain" | "watchlist" | "plan";

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}
const KEY = "tw_pending_competitors";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True when they reached the watchlist through the domain step (no homepage
  // picks) — lets them jump back and try a different domain.
  const [cameFromDomain, setCameFromDomain] = useState(false);
  // v3 Pro intent: "Select all & go Pro" on step 1 selects every competitor and
  // routes step 2 to the Pro-only "Check the benefits" view instead of the
  // Free/Pro choice. Cleared by "Switch back to Free".
  const [proIntent, setProIntent] = useState(false);
  const pagesPerCompetitor = LIMITS[plan].pagesPerCompetitor;

  // The domain step's "find my competitors" lookup — same server action the
  // homepage finder uses, so onboarding and the marketing hero can't drift.
  const [finderState, finderAction, finding] = useActionState<FinderState, FormData>(
    findCompetitorsAction,
    null,
  );

  // Load the picks stashed on the homepage (/). Two ways in:
  //   • They used the homepage finder → picks are here; confirm them (watchlist).
  //   • Plain "Start free" / a bare signup → no picks. We DON'T drop them into
  //     blank URL rows; we ask for their domain first (domain step) and suggest
  //     competitors, which they then edit or accept.
  useEffect(() => {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(localStorage.getItem(KEY) ?? "null");
    } catch {
      parsed = null;
    }
    // localStorage is only readable client-side, so this must run in an effect
    // (a client component still SSRs, where a lazy initializer would throw).
    if (!Array.isArray(parsed) || parsed.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows([]);
      setStep("domain");
      setCameFromDomain(true);
      return;
    }
    setRows(
      parsed
        .filter((p): p is { name?: unknown; url?: unknown } => !!p && typeof p === "object")
        .map((p, i) => ({
          name: String(p.name ?? "").trim(),
          url: normalizeUrl(String(p.url ?? "")),
          selected: i < limit, // pre-select the first `limit` — user can change
        })),
    );
  }, [router, limit]);

  // When a domain lookup lands, seed the editable watchlist from its suggestions
  // and advance. Guarded on result identity (setting state during render is the
  // React-sanctioned reset-on-input-change pattern; mirrors the homepage finder).
  const [seededFrom, setSeededFrom] = useState<FinderResult | null>(null);
  if (finderState?.status === "ok" && finderState.result !== seededFrom) {
    setSeededFrom(finderState.result);
    const suggested = finderState.result.competitors.map((c, i) => ({
      name: c.name.trim(),
      url: normalizeUrl(c.url),
      selected: i < limit,
    }));
    setRows(
      suggested.length > 0 ? suggested : [{ name: "", url: "", selected: true, editing: true }],
    );
    setStep("watchlist");
  }

  if (rows === null) return null;

  // Step 1 · Domain. Ask what they run, then suggest who to watch. On any
  // failure (no provider, niche company) we still let them through to the
  // editable watchlist so they can add competitors by hand — never a dead end.
  if (step === "domain") {
    function skipToManual() {
      setRows([{ name: "", url: "", selected: true, editing: true }]);
      setStep("watchlist");
    }
    return (
      <div className={styles.wrap}>
        {plan === "free" ? <StepIndicator step={1} label="Build your watchlist" /> : null}
        <h1 className={styles.title}>What do you want to keep an eye on?</h1>
        <p className={styles.sub}>
          Tell us your website and we’ll suggest the competitors worth watching. You can
          edit the list — or add your own — before anything starts.
        </p>

        <form action={finderAction} className={styles.domainForm}>
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
              aria-label="Your company name or website"
              required
            />
            <Button type="submit" disabled={finding}>
              {finding ? "Finding…" : "Find competitors"}
            </Button>
          </div>
          <p className={styles.domainHint}>
            {finding
              ? "Reading your site and finding who to watch — a few seconds."
              : "Your website gives the most accurate matches — a company name works too."}
          </p>
        </form>

        {finderState?.status === "error" && (
          <p className={styles.error}>{finderState.message}</p>
        )}

        <button type="button" className={styles.manualLink} onClick={skipToManual}>
          I’ll add competitors myself
        </button>
      </div>
    );
  }

  const selectedCount = rows.filter((r) => r.selected).length;
  // On Free without Pro intent, selecting past the limit is blocked (rows show a
  // Pro badge); Pro intent unlocks everything.
  const atCap = plan === "free" && !proIntent && selectedCount >= limit;
  const selectedRows = rows.filter((r) => r.selected);
  // Enough to advance to step 2: at least one valid selected row (Pro intent may
  // exceed the free limit — that's the whole point).
  const canContinue = selectedRows.length > 0 && selectedRows.every((r) => r.name.trim() && r.url.trim());

  function update(i: number, patch: Partial<Row>) {
    setRows((r) => (r ? r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) : r));
  }
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
  function addRow() {
    setRows((r) => {
      if (!r) return r;
      // New rows start selected unless that would exceed the free cap.
      const selected = plan !== "free" || r.filter((x) => x.selected).length < limit;
      return [...r, { name: "", url: "", selected, editing: true }];
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
      {cameFromDomain && (
        <button
          type="button"
          className={styles.manualLink}
          onClick={() => setStep("domain")}
          style={{ marginTop: 0, marginBottom: 18 }}
        >
          ← Search a different domain
        </button>
      )}
      <h1 className={styles.title}>Set up your watchlist</h1>
      <p className={styles.sub}>
        We start by watching each competitor’s <strong>homepage</strong> and email you a
        plain-English digest when something changes. You can add up to {pagesPerCompetitor}{" "}
        pages per competitor once you’re in.
      </p>

      <p className={styles.pickNote}>
        {plan !== "free"
          ? `${selectedCount} selected.`
          : proIntent
            ? `${selectedCount} selected · Pro`
            : `${selectedCount} of ${limit} selected on Free`}
      </p>

      <div className={styles.list}>
        {rows.map((row, i) => {
          // Blank / manually-added rows stay editable name + URL inputs.
          if (row.editing) {
            const disabled = !row.selected && atCap;
            return (
              <div key={i} className={`${styles.row} ${row.selected ? "" : styles.rowUnselected}`}>
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    checked={row.selected}
                    disabled={disabled}
                    onChange={() => toggle(i)}
                    aria-label={`Watch ${row.name || `competitor ${i + 1}`}`}
                  />
                </label>
                <div className={styles.fields}>
                  <input
                    className={styles.name}
                    value={row.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                    placeholder="Competitor name"
                    aria-label={`Competitor ${i + 1} name`}
                  />
                  <input
                    className={styles.url}
                    value={row.url}
                    onChange={(e) => update(i, { url: e.target.value })}
                    placeholder="https://competitor.com"
                    aria-label={`Competitor ${i + 1} homepage URL`}
                    inputMode="url"
                  />
                </div>
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => remove(i)}
                  aria-label={`Remove ${row.name || "competitor"}`}
                >
                  Remove
                </button>
              </div>
            );
          }

          // Suggested rows: v3 toggle row — tap anywhere to select/deselect.
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
        })}
      </div>

      <button type="button" className={styles.addRow} onClick={addRow} disabled={busy}>
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
            <div className={styles.upgradeNudgeTitle}>Watching more than {limit}?</div>
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
          variant={proIntent ? "primary" : "secondary"}
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
    </div>
  );
}
