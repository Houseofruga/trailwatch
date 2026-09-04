"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { seedCompetitors } from "@/features/competitors/actions";
import { normalizeUrl } from "@/features/competitors/url";
import { PLAN_LABEL, type Plan } from "@/features/plan/limits";
import styles from "./welcome.module.css";

type Row = { name: string; url: string };
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
        .filter((p): p is Row => !!p && typeof p === "object")
        .map((p) => ({
          name: String((p as Row).name ?? "").trim(),
          url: normalizeUrl(String((p as Row).url ?? "")),
        })),
    );
  }, [router]);

  if (rows === null) return null;

  const active = rows.slice(0, limit);
  const locked = rows.slice(limit);
  const canStart =
    active.length > 0 && active.every((r) => r.name.trim() && r.url.trim());

  function update(i: number, patch: Partial<Row>) {
    setRows((r) => (r ? r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) : r));
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
      .slice(0, limit)
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

      <div className={styles.list}>
        {active.map((row, i) => (
          <div key={i} className={styles.row}>
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
        ))}
      </div>

      {locked.length > 0 && (
        <div className={styles.locked}>
          <div className={styles.lockedNote}>
            {PLAN_LABEL[plan]} tracks {limit} competitors. Keep {limit}, or{" "}
            <Link href="/billing" className={styles.upgrade}>
              upgrade to Pro
            </Link>{" "}
            to watch all {rows.length}.
          </div>
          {locked.map((row, i) => (
            <div key={i} className={`${styles.row} ${styles.rowLocked}`}>
              <div className={styles.fields}>
                <span className={styles.lockedName}>{row.name || "Competitor"}</span>
                <span className={styles.lockedUrl}>
                  {row.url.replace(/^https?:\/\//, "")}
                </span>
              </div>
              <button
                type="button"
                className={styles.remove}
                onClick={() => remove(limit + i)}
                aria-label={`Remove ${row.name || "competitor"}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.start}
          onClick={start}
          disabled={!canStart || busy}
        >
          {busy
            ? "Setting up…"
            : `Start watching ${active.length} competitor${active.length !== 1 ? "s" : ""}`}
        </button>
        <button type="button" className={styles.skip} onClick={skip} disabled={busy}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
