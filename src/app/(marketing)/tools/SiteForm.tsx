"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { SpinnerIcon } from "@/components/ui/icons";
import styles from "./tools.module.css";

// Shared pieces of every free tool (DESIGN 08): the site field, the checking
// skeleton, the store line under a verdict, and the "track it" next step.

type Outcome<T> = ({ ok: true } & T) | { ok: false; message: string };

/** Field + submit state for a tool that checks one site. */
export function useSiteCheck<T>(run: (site: string) => Promise<Outcome<T>>, emptyMessage = "Enter a website like dewlane.com.") {
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<({ ok: true } & T) | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const site = value.trim();
    setResult(null);
    if (!site) return setError(emptyMessage);
    setError(null);
    setChecking(site);
    const r = await run(site).catch((): Outcome<T> => ({ ok: false, message: "We couldn't open that site. Check the address and try again." }));
    setChecking(null);
    if (r.ok) setResult(r);
    else setError(r.message);
  }

  return { value, setValue, checking, error, result, submit };
}

const IconAlertSmall = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6" />
    <path d="M12 16h.01" />
  </svg>
);

export function SiteForm({
  label,
  button,
  placeholder = "dewlane.com",
  state,
}: {
  label: string;
  button: string;
  placeholder?: string;
  state: Pick<ReturnType<typeof useSiteCheck>, "value" | "setValue" | "checking" | "error" | "submit">;
}) {
  const { value, setValue, checking, error, submit } = state;
  return (
    <section className={`${styles.card} ${styles.formCard}`}>
      <form className={styles.form} onSubmit={submit} noValidate>
        <label htmlFor="site" className={styles.label}>
          {label}
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
              placeholder={placeholder}
              value={value}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "site-error site-note" : "site-note"}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <Button variant="primary" type="submit" tall loading={!!checking}>
            {button}
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
  );
}

export function CheckingCard({ site, note = "This takes a few seconds." }: { site: string; note?: string }) {
  return (
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
          Checking {site}. {note}
        </p>
      </div>
    </section>
  );
}

/** "dewlane.com · Shopify" under a verdict. */
export function StoreLine({ name, host, children }: { name: string; host: string; children?: React.ReactNode }) {
  return (
    <div className={styles.verdictMeta}>
      <Avatar name={name} domain={host} />
      <span>{host}</span>
      {children}
    </div>
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

export function NextStep({ title, host, name }: { title: string; host: string; name: string }) {
  return (
    <div className={styles.nextStep}>
      <div className={styles.nextStepText}>
        <p className={styles.nextStepTitle}>{title}</p>
        <p className={styles.nextStepSub}>Track it free with Trailwatch.</p>
      </div>
      <Button variant="primary" href="/login?mode=signup" onClick={() => rememberStore(host, name)}>
        Join the beta
      </Button>
    </div>
  );
}
