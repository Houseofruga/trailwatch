"use client";

import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Feedback";
import { count, money } from "@/features/appData/format";
import { storeSnapshotAction } from "@/features/tools/actions";
import type { StoreSnapshot as Snapshot } from "@/features/tools/storeSnapshot";
import { ProductList } from "../ProductList";
import { CheckingCard, NextStep, SiteForm, StoreLine, useSiteCheck } from "../SiteForm";
import { ToolIcons } from "../toolIcons";
import styles from "../tools.module.css";

export function StoreSnapshot() {
  const check = useSiteCheck<Omit<Snapshot, "ok">>(storeSnapshotAction, "Enter a store like dewlane.com.");
  const { checking, result: s } = check;

  return (
    <div className={styles.toolColumn}>
      <SiteForm label="Store to look at" button="Take a snapshot" state={check} />
      {checking ? <CheckingCard site={checking} note="Reading its catalog takes up to 15 seconds." /> : null}
      {s ? (
        <section className={styles.card} aria-live="polite">
          <div className={styles.resultBody}>
            <div className={styles.verdict}>
              <span className={styles.verdictIcon}>{ToolIcons.chart}</span>
              <div className={styles.verdictText}>
                <h2 className={styles.verdictTitle}>{s.name} at a glance</h2>
                <StoreLine name={s.name} host={s.host}>
                  <span aria-hidden="true">·</span>
                  <Badge>Shopify</Badge>
                </StoreLine>
              </div>
            </div>

            <div className={styles.statGrid}>
              <div className={styles.statTile}>
                <Stat label="Products" size="md" value={s.complete ? count(s.productCount) : `${count(s.productCount)}+`} />
              </div>
              <div className={styles.statTile}>
                <Stat
                  label="Price range"
                  size="md"
                  value={s.priceRange ? `${money(s.priceRange.min, { whole: true })}–${money(s.priceRange.max, { whole: true })}` : "—"}
                  sub={s.avgPrice !== null ? `${money(s.avgPrice, { whole: true })} average` : undefined}
                />
              </div>
              <div className={styles.statTile}>
                <Stat label="On sale" size="md" value={count(s.sale.count)} sub={`${s.sale.share}% of what’s in stock`} />
              </div>
              <div className={styles.statTile}>
                <Stat label="Sold out" size="md" value={count(s.soldOutCount)} />
              </div>
            </div>

            <div className={styles.how}>
              <h3 className={styles.h3}>New in the last 30 days{s.launched.count ? ` (${count(s.launched.count)})` : ""}</h3>
              {s.launched.top.length ? (
                <ProductList host={s.host} items={s.launched.top} show="launched" />
              ) : (
                <p className={styles.empty}>No new products in the last 30 days.</p>
              )}
            </div>

            {s.sale.top.length ? (
              <div className={styles.how}>
                <h3 className={styles.h3}>Biggest discounts</h3>
                <ProductList host={s.host} items={s.sale.top} show="discount" />
              </div>
            ) : null}

            <p className={styles.catalogNote}>
              Read from its public catalog just now
              {s.complete ? "." : `, based on its first ${count(s.productCount)} products.`}
            </p>
          </div>
          <NextStep host={s.host} name={s.name} title={`Want to know when ${s.name} launches, changes prices or starts a sale?`} />
        </section>
      ) : null}
    </div>
  );
}
