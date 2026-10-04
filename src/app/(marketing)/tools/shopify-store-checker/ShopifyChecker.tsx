"use client";

import { Badge } from "@/components/ui/Badge";
import { IconCheck, IconX } from "@/components/ui/icons";
import { checkShopifyAction } from "@/features/tools/actions";
import type { ShopifyCheck } from "@/features/tools/shopifyCheck";
import { CheckingCard, NextStep, SiteForm, StoreLine, useSiteCheck } from "../SiteForm";
import { ToolIcons } from "../toolIcons";
import styles from "../tools.module.css";

type Result = Extract<ShopifyCheck, { ok: true }>;

const IconStore = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 10v10h16V10" />
    <path d="M3 10l2-6h14l2 6z" />
    <path d="M10 20v-5h4v5" />
  </svg>
);

const IconQuestion = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14" />
    <path d="M12 17.5h.01" />
  </svg>
);

function title(r: Result): string {
  if (r.verdict === "shopify") return `Yes, ${r.name} runs on Shopify.`;
  if (r.verdict === "not-a-store") return "No, this doesn’t look like an online store.";
  if (r.verdict === "unknown") return "We couldn’t tell.";
  return r.platformName ? `No, ${r.name} isn’t on Shopify.` : `No, ${r.name} doesn’t appear to use Shopify.`;
}

function verdictIcon(r: Result) {
  if (r.verdict === "shopify") return <IconCheck />;
  if (r.verdict === "not-a-store") return <IconStore />;
  if (r.verdict === "unknown") return <IconQuestion />;
  return <IconX />;
}

/** A reason line, with /products.json set as code. */
function Reason({ text }: { text: string }) {
  const parts = text.split("/products.json");
  const icon = /catalog|products\.json/.test(text) ? ToolIcons.doc : /server|headers/.test(text) ? ToolIcons.server : ToolIcons.globe;
  return (
    <li>
      {icon}
      <span>
        {parts.map((p, i) => (
          <span key={i}>
            {i > 0 ? <code>/products.json</code> : null}
            {p}
          </span>
        ))}
      </span>
    </li>
  );
}

export function ShopifyChecker() {
  const check = useSiteCheck<Omit<Result, "ok">>(checkShopifyAction);
  const { checking, result } = check;
  // Trailwatch tracks Shopify stores only.
  const trackable = result?.verdict === "shopify";

  return (
    <div className={styles.toolColumn}>
      <SiteForm label="Website to check" button="Check" state={check} />

      {checking ? <CheckingCard site={checking} /> : null}

      {result ? (
        <section className={styles.card} aria-live="polite">
          <div className={styles.resultBody}>
            <div className={styles.verdict}>
              <span className={styles.verdictIcon}>{verdictIcon(result)}</span>
              <div className={styles.verdictText}>
                <h2 className={styles.verdictTitle}>{title(result)}</h2>
                <StoreLine name={result.name} host={result.host}>
                  {result.platformName ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <Badge>{result.platformName}</Badge>
                    </>
                  ) : null}
                </StoreLine>
              </div>
            </div>
            <div className={styles.how}>
              <h3 className={styles.h3}>How we can tell</h3>
              <ul className={styles.reasons}>
                {result.evidence.map((e) => (
                  <Reason key={e} text={e} />
                ))}
              </ul>
            </div>
            {result.verdict === "shopify" ? (
              <p className={styles.catalogNote}>
                {result.catalogPublic ? (
                  <>
                    <strong>Catalog: public.</strong> Its catalog is public, so Trailwatch can track every product, price and
                    stock change.
                  </>
                ) : (
                  <>
                    <strong>Catalog: not public.</strong> Its catalog isn’t public, so Trailwatch tracks its key pages
                    instead.
                  </>
                )}
              </p>
            ) : null}
          </div>

          {trackable ? (
            <NextStep
              host={result.host}
              name={result.name}
              title={
                result.catalogPublic
                  ? `Want to know when ${result.name} launches, changes prices or starts a sale?`
                  : `Want to know when ${result.name} changes its homepage, sale page or policies?`
              }
            />
          ) : result.verdict === "other-store" ? (
            <p className={styles.resultFoot}>Trailwatch tracks Shopify stores, so it can’t track {result.name}.</p>
          ) : result.verdict === "not-a-store" ? (
            <p className={styles.resultFoot}>Checked a blog or a brand site? Try the store’s shop address instead.</p>
          ) : (
            <p className={styles.resultFoot}>
              Some sites block automated visits. Try again later, or check another page of the site. Nothing was saved.
              You can run the check again any time.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
