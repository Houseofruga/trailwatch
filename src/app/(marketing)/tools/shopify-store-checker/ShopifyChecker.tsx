"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconCheck, IconX, SpinnerIcon } from "@/components/ui/icons";
import { checkShopifyAction } from "@/features/tools/actions";
import type { ShopifyCheck } from "@/features/tools/shopifyCheck";
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

const IconAlertSmall = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6" />
    <path d="M12 16h.01" />
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

/** Hand the store to onboarding, as the homepage finder does (read on /welcome). */
function rememberStore(host: string, name: string) {
  try {
    localStorage.setItem("tw_pending_competitors", JSON.stringify([{ name, url: host }]));
  } catch {
    /* storage disabled: they can add it after signing up */
  }
}

export function ShopifyChecker() {
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    const site = value.trim();
    setResult(null);
    if (!site) return setError("Enter a website like dewlane.com.");
    setError(null);
    setChecking(site);
    const r = await checkShopifyAction(site).catch(
      (): ShopifyCheck => ({ ok: false, message: "We couldn't open that site. Check the address and try again." }),
    );
    setChecking(null);
    if (r.ok) setResult(r);
    else setError(r.message);
  }

  const trackable = result && result.verdict !== "not-a-store" && result.verdict !== "unknown";

  return (
    <div className={styles.toolColumn}>
      <section className={`${styles.card} ${styles.formCard}`}>
        <form className={styles.form} onSubmit={check} noValidate>
          <label htmlFor="site" className={styles.label}>
            Website to check
          </label>
          <div className={styles.fieldRow}>
            <div className={`${styles.field} ${error ? styles.fieldError : ""}`}>
              <span className={styles.prefix}>https://</span>
              <input
                id="site"
                className={styles.input}
                type="text"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="dewlane.com"
                value={value}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "site-error site-note" : "site-note"}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <Button variant="primary" type="submit" tall loading={!!checking}>
              Check
            </Button>
          </div>
          {error ? (
            <p id="site-error" className={styles.error}>
              <IconAlertSmall />
              <span>{error}</span>
            </p>
          ) : null}
          <p id="site-note" className={styles.note}>
            Free · No sign-up
          </p>
          {checking ? (
            <p role="status" className="visually-hidden">
              Checking {checking}
            </p>
          ) : null}
        </form>
      </section>

      {checking ? (
        <section className={styles.card} aria-busy="true">
          <div className={styles.checking}>
            <div className={styles.skelRow}>
              <span className={styles.skel} style={{ width: 40, height: 40, borderRadius: 999 }} />
              <span className={styles.skelLines}>
                <span className={styles.skel} style={{ width: "60%", height: 16 }} />
                <span className={styles.skel} style={{ width: "30%", height: 10 }} />
              </span>
            </div>
            <span className={styles.skelLines}>
              <span className={styles.skel} style={{ width: "25%", height: 10 }} />
              <span className={styles.skel} style={{ width: "90%", height: 10 }} />
              <span className={styles.skel} style={{ width: "75%", height: 10 }} />
            </span>
            <p className={styles.checkingNote}>
              <SpinnerIcon size={14} />
              Checking {checking}. This takes a few seconds.
            </p>
          </div>
        </section>
      ) : null}

      {result ? (
        <section className={styles.card} aria-live="polite">
          <div className={styles.resultBody}>
            <div className={styles.verdict}>
              <span className={styles.verdictIcon}>{verdictIcon(result)}</span>
              <div className={styles.verdictText}>
                <h2 className={styles.verdictTitle}>{title(result)}</h2>
                <div className={styles.verdictMeta}>
                  <Avatar name={result.name} domain={result.host} />
                  <span>{result.host}</span>
                  {result.platformName ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <Badge>{result.platformName}</Badge>
                    </>
                  ) : null}
                </div>
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
                    <strong>Catalog: public.</strong> Its catalog is public, so TrailWatch can track every product, price and
                    stock change.
                  </>
                ) : (
                  <>
                    <strong>Catalog: not public.</strong> Its catalog isn’t public, so TrailWatch tracks its key pages
                    instead.
                  </>
                )}
              </p>
            ) : null}
          </div>

          {trackable ? (
            <div className={styles.nextStep}>
              <div className={styles.nextStepText}>
                <p className={styles.nextStepTitle}>
                  {result.catalogPublic
                    ? `Want to know when ${result.name} launches, changes prices or starts a sale?`
                    : `Want to know when ${result.name} changes its homepage, sale page or policies?`}
                </p>
                <p className={styles.nextStepSub}>Track it free with TrailWatch.</p>
              </div>
              <Button variant="primary" href="/login?mode=signup" onClick={() => rememberStore(result.host, result.name)}>
                Join the beta
              </Button>
            </div>
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
