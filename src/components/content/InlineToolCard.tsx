"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconAlert, SpinnerIcon } from "@/components/ui/icons";
import { count, money } from "@/features/appData/format";
import { storeSnapshotAction } from "@/features/tools/actions";
import type { StoreSnapshot } from "@/features/tools/storeSnapshot";
import styles from "./content.module.css";

// The free store snapshot, usable inside an article (DESIGN 14b inline tool
// card): default, checking, a three-number result, and the error state.

const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);

export function InlineToolCard() {
  const id = useId();
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<StoreSnapshot | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const site = value.trim();
    setResult(null);
    if (!site) return setFailed(true);
    setFailed(false);
    setChecking(site.replace(/^https?:\/\//, ""));
    const r = await storeSnapshotAction(site).catch(() => null);
    setChecking(null);
    if (r?.ok) setResult(r);
    else setFailed(true);
  }

  return (
    <section className={`${styles.card} ${styles.tool}`}>
      <div className={styles.toolHead}>
        <span className={styles.toolTile}>
          <ChartIcon />
        </span>
        <div className={styles.toolHeadText}>
          <h2 className={styles.toolName}>Store snapshot</h2>
          <p className={styles.toolBlurb}>See any store&rsquo;s catalog size, sale share and prices. Free, no sign-up.</p>
        </div>
      </div>

      <form className={styles.toolForm} onSubmit={submit} noValidate>
        <label htmlFor={id}>Store address</label>
        <div className={styles.toolRow}>
          <div className={`${styles.toolField} ${failed ? styles.toolFieldInvalid : ""}`}>
            <span className={styles.toolPrefix}>https://</span>
            <input
              id={id}
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="dewlane.com"
              value={value}
              aria-invalid={failed || undefined}
              aria-describedby={failed ? `${id}-err` : undefined}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <Button variant="primary" tall type="submit" loading={!!checking}>
            Check a store
          </Button>
        </div>
      </form>

      {checking ? (
        <div role="status" className={styles.toolChecking}>
          <SpinnerIcon size={18} tone="#4a4a4a" />
          Reading {checking}. This takes a few seconds.
        </div>
      ) : null}

      {failed && !checking ? (
        <div id={`${id}-err`} role="alert" className={styles.toolError}>
          <span className={styles.toolErrorIcon}>
            <IconAlert size={18} />
          </span>
          <div className={styles.toolErrorText}>
            <p className={styles.toolErrorTitle}>We couldn&rsquo;t read that store</p>
            <p className={styles.toolErrorBody}>
              It may not be a Shopify store, or it blocks automated visits. Check the address, or try another store.
            </p>
          </div>
        </div>
      ) : null}

      {result ? (
        <div aria-live="polite" className={styles.toolResult}>
          <div className={styles.toolStore}>
            <span className={styles.toolStoreAvatar} aria-hidden="true">
              {result.name[0]?.toUpperCase()}
            </span>
            <div className={styles.toolStoreText}>
              <span className={styles.toolStoreName}>{result.name}</span>
              <span className={styles.toolStoreMeta}>{result.host} · read just now</span>
            </div>
          </div>
          <div className={styles.toolStats}>
            <div className={styles.toolStat}>
              <span className={styles.toolStatLabel}>Products</span>
              <span className={styles.toolStatValue}>{result.complete ? count(result.productCount) : `${count(result.productCount)}+`}</span>
            </div>
            <div className={styles.toolStat}>
              <span className={styles.toolStatLabel}>On sale</span>
              <span className={styles.toolStatValue}>{count(result.sale.count)}</span>
            </div>
            <div className={styles.toolStat}>
              <span className={styles.toolStatLabel}>Average price</span>
              <span className={styles.toolStatValue}>{result.avgPrice !== null ? money(result.avgPrice) : "—"}</span>
            </div>
          </div>
          <div>
            <Button tall href="/tools/store-snapshot">
              See the full snapshot
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
