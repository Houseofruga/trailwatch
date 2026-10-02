"use client";

import { Badge } from "@/components/ui/Badge";
import { Stat } from "@/components/ui/Feedback";
import { count } from "@/features/appData/format";
import { storeSnapshotAction } from "@/features/tools/actions";
import type { StoreSnapshot } from "@/features/tools/storeSnapshot";
import { ProductList } from "../ProductList";
import { CheckingCard, NextStep, SiteForm, StoreLine, useSiteCheck } from "../SiteForm";
import { ToolIcons } from "../toolIcons";
import styles from "../tools.module.css";

function title(s: StoreSnapshot): string {
  if (s.sale.verdict === "sitewide") return `Yes, ${s.name} is running a sitewide sale.`;
  if (s.sale.verdict === "some") return `${s.name} has some products on sale.`;
  return `No sale at ${s.name} right now.`;
}

export function SaleChecker() {
  const check = useSiteCheck<Omit<StoreSnapshot, "ok">>(storeSnapshotAction, "Enter a store like dewlane.com.");
  const { checking, result: s } = check;

  return (
    <div className={styles.toolColumn}>
      <SiteForm label="Store to check" button="Check for a sale" state={check} />
      {checking ? <CheckingCard site={checking} note="Reading its catalog takes up to 15 seconds." /> : null}
      {s ? (
        <section className={styles.card} aria-live="polite">
          <div className={styles.resultBody}>
            <div className={styles.verdict}>
              <span className={styles.verdictIcon}>{ToolIcons.tag}</span>
              <div className={styles.verdictText}>
                <h2 className={styles.verdictTitle}>{title(s)}</h2>
                <StoreLine name={s.name} host={s.host}>
                  {s.sale.verdict === "sitewide" ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <Badge tone="attention">Sitewide sale</Badge>
                    </>
                  ) : null}
                </StoreLine>
              </div>
            </div>

            {s.sale.count > 0 ? (
              <>
                <div className={styles.statGrid}>
                  <div className={styles.statTile}>
                    <Stat label="Products on sale" size="md" value={count(s.sale.count)} />
                  </div>
                  <div className={styles.statTile}>
                    <Stat label="Of what’s in stock" size="md" value={`${s.sale.share}%`} />
                  </div>
                  <div className={styles.statTile}>
                    <Stat label="Average discount" size="md" value={`${s.sale.avgPctOff ?? 0}% off`} />
                  </div>
                  <div className={styles.statTile}>
                    <Stat label="Deepest discount" size="md" value={`${s.sale.maxPctOff ?? 0}% off`} />
                  </div>
                </div>
                <div className={styles.how}>
                  <h3 className={styles.h3}>Biggest discounts</h3>
                  <ProductList host={s.host} items={s.sale.top} show="discount" />
                </div>
              </>
            ) : (
              <p className={styles.empty}>None of its in-stock products show a crossed-out price right now.</p>
            )}

            <p className={styles.catalogNote}>
              We count a product as on sale when its price is below its listed “compare at” price.
              {s.complete ? "" : ` Based on its first ${count(s.productCount)} products.`}
            </p>
          </div>
          <NextStep
            host={s.host}
            name={s.name}
            title={
              s.sale.count > 0
                ? `Want to know when ${s.name}’s sale ends, deepens or spreads?`
                : `Want an alert the moment ${s.name} starts its next sale?`
            }
          />
        </section>
      ) : null}
    </div>
  );
}
