"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { PlusIcon } from "@/components/icons";
import { seedCompetitors } from "@/features/competitors/actions";
import { normalizeUrl } from "@/features/competitors/url";
import { LIMITS, PLAN_LABEL, type Plan } from "@/features/plan/limits";
import { OnboardingPlanStep } from "./OnboardingPlanStep";
import styles from "./welcome.module.css";

type Row = { name: string; url: string; selected: boolean };
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
  const [step, setStep] = useState<"watchlist" | "plan">("watchlist");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pagesPerCompetitor = LIMITS[plan].pagesPerCompetitor;

  // Load the picks stashed on the homepage (/). Nothing to do without them.
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
      // Plain "Start free" — nothing was pre-picked on the homepage. Start onboarding with
      // blank rows the visitor fills in, rather than skipping setup entirely.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows(Array.from({ length: limit }, () => ({ name: "", url: "", selected: true })));
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

  if (rows === null) return null;

  const total = rows.length;
  const overLimit = total > limit;
  const selectedCount = rows.filter((r) => r.selected).length;
  const atCap = plan === "free" && selectedCount >= limit;
  const selectedRows = rows.filter((r) => r.selected);
  const canSeed =
    selectedCount > 0 &&
    selectedCount <= limit &&
    selectedRows.every((r) => r.name.trim() && r.url.trim());

  function update(i: number, patch: Partial<Row>) {
    setRows((r) => (r ? r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) : r));
  }
  function toggle(i: number) {
    setRows((r) => {
      if (!r) return r;
      const row = r[i];
      // Block selecting past the plan cap; unselecting is always allowed.
      if (!row.selected && plan === "free" && r.filter((x) => x.selected).length >= limit) {
        return r;
      }
      return r.map((x, idx) => (idx === i ? { ...x, selected: !x.selected } : x));
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
      return [...r, { name: "", url: "", selected }];
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
        onBack={() => setStep("watchlist")}
        onContinueFree={start}
      />
    );
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Set up your watchlist</h1>
      <p className={styles.sub}>
        We start by watching each competitor’s <strong>homepage</strong> and email you a
        plain-English digest when something changes. You can add up to {pagesPerCompetitor}{" "}
        pages per competitor once you’re in.
      </p>

      {overLimit && (
        <p className={styles.limitNote}>
          {PLAN_LABEL[plan]} tracks {limit} competitors — choose {limit} to start free, or
          upgrade to Pro to watch all {total}.
        </p>
      )}

      <div className={styles.colLabels}>
        <div className={styles.colLabelName}>Competitor</div>
        <div className={styles.colLabelUrl}>Homepage URL</div>
        <div className={styles.colLabelSpacer} />
      </div>

      <div className={styles.list}>
        {rows.map((row, i) => {
          const disabled = !row.selected && atCap;
          return (
            <div
              key={i}
              className={`${styles.row} ${row.selected ? "" : styles.rowUnselected}`}
            >
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
        })}
      </div>

      <button type="button" className={styles.addRow} onClick={addRow} disabled={busy}>
        <PlusIcon size={12} />
        Add another competitor
      </button>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        {overLimit ? (
          <>
            <Button type="button" onClick={() => setStep("plan")} disabled={busy}>
              Upgrade to watch all {total} competitors
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={start}
              disabled={!canSeed || busy}
            >
              {busy
                ? "Setting up…"
                : `Continue free with ${selectedCount} competitor${selectedCount !== 1 ? "s" : ""}`}
            </Button>
          </>
        ) : (
          <Button type="button" onClick={start} disabled={!canSeed || busy}>
            {busy
              ? "Setting up…"
              : `Start watching ${selectedCount} competitor${selectedCount !== 1 ? "s" : ""}`}
          </Button>
        )}
      </div>
    </div>
  );
}
