"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { seedCompetitors } from "@/features/competitors/actions";
import { normalizeUrl } from "@/features/competitors/url";
import { PLAN_LABEL, type Plan } from "@/features/plan/limits";
import styles from "./welcome.module.css";

type Row = { name: string; url: string; selected: boolean };
const KEY = "tw_pending_competitors";

export function WelcomeOnboarding({ plan, limit }: { plan: Plan; limit: number }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null); // null = still loading
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the picks stashed on /try. Nothing to do without them.
  useEffect(() => {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(localStorage.getItem(KEY) ?? "null");
    } catch {
      parsed = null;
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      router.replace("/dashboard");
      return;
    }
    // localStorage is only readable client-side, so this must run in an effect
    // (a client component still SSRs, where a lazy initializer would throw).
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  function skip() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    router.push("/dashboard");
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
    const msg =
      res.created === 1
        ? "Added 1 competitor — we captured a baseline and will email you what changes."
        : `Added ${res.created} competitors — we captured baselines and will email you what changes.`;
    router.push(`/dashboard?flash=${encodeURIComponent(msg)}`);
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Set up your watchlist</h1>
      <p className={styles.sub}>
        We’ll watch each competitor’s homepage and email you a plain-English digest when
        something changes. You can add more pages anytime.
      </p>

      {overLimit && (
        <p className={styles.limitNote}>
          {PLAN_LABEL[plan]} tracks {limit} competitors — choose {limit} to start free, or{" "}
          <Link href="/billing?from=welcome" className={styles.upgradeLink}>
            upgrade to Pro
          </Link>{" "}
          to watch all {total}.
        </p>
      )}

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
                ×
              </button>
            </div>
          );
        })}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        {overLimit ? (
          <>
            <Link href="/billing?from=welcome" className={styles.primary}>
              Upgrade to watch all {total} competitors
            </Link>
            <button
              type="button"
              className={styles.secondary}
              onClick={start}
              disabled={!canSeed || busy}
            >
              {busy
                ? "Setting up…"
                : `Continue free with ${selectedCount} competitor${selectedCount !== 1 ? "s" : ""}`}
            </button>
          </>
        ) : (
          <button
            type="button"
            className={styles.primary}
            onClick={start}
            disabled={!canSeed || busy}
          >
            {busy
              ? "Setting up…"
              : `Start watching ${selectedCount} competitor${selectedCount !== 1 ? "s" : ""}`}
          </button>
        )}
        <button type="button" className={styles.skip} onClick={skip} disabled={busy}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
