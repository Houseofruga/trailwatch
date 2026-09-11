"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";
import { PageTypeSelect } from "@/components/PageTypeSelect";
import { findCompetitorsAction, type FinderState } from "@/app/(marketing)/actions";
import { createCompetitor, type FormState } from "@/features/competitors/actions";
import { canonUrl as canon, toFullUrl as toFull, hostname as hostOf, rowUrlError } from "@/features/competitors/rowRules";
import { pageTypeLabel, type PageType } from "@/features/competitors/pageTypes";
import styles from "./CompetitorSetup.module.css";

type ExistingUrl = { url: string; competitor: string };
type Row = { key: string; url: string; label: string; pageType: PageType; locked: boolean };
function newRow(partial?: Partial<Row>): Row {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    url: "",
    label: "",
    pageType: "other",
    locked: false,
    ...partial,
  };
}

function StartButton({ disabled, label = "Start tracking" }: { disabled: boolean; label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.start} disabled={disabled || pending}>
      {pending ? "Capturing…" : label}
    </button>
  );
}

function FindButton({ compact }: { compact?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={compact ? styles.searchBtnSec : styles.searchBtn} disabled={pending}>
      {compact ? "Search" : "Find competitors"}
    </button>
  );
}

/**
 * Add Competitor takeover (IA "Add flows" §3–5). Search tab (the finder) and an
 * Add-manually tab share one edit view (name + page rows with a type dropdown).
 * Selecting a search result pre-fills the name + auto-fetches the homepage as a
 * locked first row. Row URLs validate live (format, one-site-per-competitor,
 * account-wide duplicate); creation goes through `createCompetitor`.
 */
export function CompetitorSetup({
  plan,
  competitorCount,
  competitorCap,
  pagesPerCompetitor,
  existingUrls,
  onClose,
}: {
  plan: "free" | "paid";
  competitorCount: number;
  competitorCap: number;
  pagesPerCompetitor: number;
  existingUrls: ExistingUrl[];
  onClose: () => void;
}) {
  const atCompetitorCap = competitorCount >= competitorCap;
  const planLabel = plan === "free" ? "Free" : "Pro";

  const [phase, setPhase] = useState<"search" | "manual" | "edit">("search");
  const [query, setQuery] = useState("");
  const [searchState, searchAction, searching] = useActionState<FinderState, FormData>(findCompetitorsAction, null);

  const [name, setName] = useState("");
  // A competitor's first page is almost always its homepage — default the first
  // (manual) row to that type. Additional rows (addRow) still default to "other".
  const [rows, setRows] = useState<Row[]>([newRow({ pageType: "homepage" })]);
  const [createState, createAction] = useActionState<FormState, FormData>(createCompetitor, null);

  const dupOwner = new Map(existingUrls.map((e) => [canon(e.url), e.competitor]));

  function selectResult(cName: string, cUrl: string) {
    setName(cName);
    setRows([newRow({ url: cUrl, label: "Homepage", pageType: "homepage", locked: true })]);
    setPhase("edit");
  }
  function goManual() {
    if (rows.length === 1 && !rows[0].url) setRows([newRow({ pageType: "homepage" })]);
    if (!name && query) setName(query);
    setPhase("manual");
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => (rs.length >= pagesPerCompetitor ? rs : [...rs, newRow()]));
  }
  function removeRow(key: string) {
    setRows((rs) => (rs.length === 1 ? rs : rs.filter((r) => r.key !== key)));
  }

  // --- row validation ---
  const row0Full = toFull(rows[0]?.url ?? "");
  function rowError(r: Row): string | null {
    return rowUrlError(r.url, { row0Full, locked: r.locked, dupOwner });
  }
  const rowErrors = rows.map(rowError);
  const filledRows = rows.filter((r) => r.url.trim());
  const errorCount = rowErrors.filter(Boolean).length;
  const canAddRow = rows.length < pagesPerCompetitor;

  // Soft cross-domain note: >1 distinct hostname among valid rows sharing a site.
  const hosts = Array.from(new Set(filledRows.map((r) => hostOf(r.url)).filter((h): h is string => Boolean(h))));
  const crossDomain = hosts.length > 1;

  const canSubmit = name.trim().length > 0 && filledRows.length > 0 && errorCount === 0;

  // ---------- plan limit: at the competitor cap, no form at all ----------
  if (atCompetitorCap) {
    return (
      <div className={styles.card}>
        <div className={styles.chead}>
          <div className={styles.cheadLeft}>
            <div>
              <div className={styles.ctitle}>Add a competitor</div>
              <div className={styles.sub}>
                {planLabel} · tracking {competitorCount} of {competitorCap} competitors
              </div>
            </div>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">&#10005;</button>
        </div>
        <div className={styles.limitBody}>
          <span className={styles.limitBadgeLg} aria-hidden="true">{plan === "paid" ? "✓" : "↑"}</span>
          <div className={styles.limitTitle}>
            You&rsquo;re watching all {competitorCap} of your {planLabel} competitor{competitorCap === 1 ? "" : "s"}
          </div>
          {plan === "paid" ? (
            <>
              <p className={styles.limitText}>
                That&rsquo;s the most Pro tracks. To add a different one, remove a competitor you no longer need &mdash;
                its pages and history go with it.
              </p>
              <div className={styles.limitActions}>
                <button type="button" className={styles.start} onClick={onClose}>Manage competitors</button>
              </div>
            </>
          ) : (
            <>
              <p className={styles.limitText}>
                Upgrade to Pro to track more competitors, each with more pages. Your current competitors and their
                history stay exactly as they are.
              </p>
              <div className={styles.limitActions}>
                <Link href="/billing" className={styles.start}>&#8593; Upgrade to Pro</Link>
                <button type="button" className={styles.secBtn} onClick={onClose}>Manage competitors</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---------- shared edit view (manual + post-select) ----------
  function editView(header: ReactNode) {
    const usedNote = `${filledRows.length || rows.length} of ${pagesPerCompetitor} used`;
    return (
      <form action={createAction} className={styles.card}>
        <input type="hidden" name="name" value={name} />
        {rows.map((r) => (
          <span key={`h-${r.key}`} hidden>
            {/* Submit the normalized URL (bare domains → https://) — the client
                validates the normalized form, so the server must receive it too. */}
            <input type="hidden" name="url" value={toFull(r.url)} />
            {/* No free-text page name — the label is the page type's display name. */}
            <input type="hidden" name="label" value={pageTypeLabel(r.pageType)} />
            <input type="hidden" name="pageType" value={r.pageType} />
          </span>
        ))}

        {header}

        <div className={styles.ebody}>
          <div className={styles.field}>
            <span className={styles.flabel}>Competitor name</span>
            <div className={styles.fld}>
              <input
                className={styles.textInput}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Retool"
                autoFocus={phase === "manual"}
              />
            </div>
          </div>

          <span className={styles.flabel}>{pagesPerCompetitor === 1 ? "Page" : "Pages"}</span>
          <div className={styles.rows}>
            {rows.map((r, i) => {
              const err = rowErrors[i];
              return (
                <div key={r.key}>
                  <div className={styles.rowLine}>
                    <div className={err ? styles.fldErr : styles.fld} style={{ flex: 1 }}>
                      <input
                        className={styles.urlInput}
                        value={r.url}
                        onChange={(e) => updateRow(r.key, { url: e.target.value })}
                        placeholder="Add a page URL"
                        inputMode="url"
                        disabled={r.locked}
                      />
                    </div>
                    <PageTypeSelect
                      value={r.pageType}
                      onChange={(t) => updateRow(r.key, { pageType: t })}
                      disabled={r.locked}
                    />
                    {r.locked || rows.length === 1 ? (
                      <span className={styles.removeDisabled} aria-hidden="true" title={r.locked ? "The homepage stays" : "Keep at least one page"}>&#10005;</span>
                    ) : (
                      <button type="button" className={styles.remove} onClick={() => removeRow(r.key)} aria-label="Remove page">&#10005;</button>
                    )}
                  </div>
                  {err ? (
                    <div className={styles.errNote}>
                      <span aria-hidden="true">&#9888;</span>
                      <span>{err}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {crossDomain ? (
            <div className={styles.note}>
              <span aria-hidden="true">&#8505;</span>
              <span>
                These pages span {hosts.length} domains ({hosts.join(", ")}). That&rsquo;s fine — just confirming it&rsquo;s intentional.
              </span>
            </div>
          ) : null}

          {plan === "free" && !canAddRow ? (
            <div className={styles.freeNudge}>
              <span className={styles.limitBadge} aria-hidden="true">&#8593;</span>
              <div className={styles.freeNudgeText}>
                <div className={styles.freeNudgeTitle}>Track more pages per competitor</div>
                <div className={styles.sub}>Free watches {pagesPerCompetitor} page{pagesPerCompetitor === 1 ? "" : "s"} per competitor. Pro adds pricing, changelog, docs and more.</div>
              </div>
              <Link href="/billing" className={styles.start}>Upgrade</Link>
            </div>
          ) : canAddRow ? (
            <div className={styles.addRow}>
              <button type="button" className={styles.secBtn} onClick={addRow}>
                <span className={styles.plusSm} aria-hidden="true">+</span>Add page
              </button>
              <span className={styles.sub}>{usedNote}</span>
            </div>
          ) : (
            <div className={styles.capNote}>{pagesPerCompetitor} of {pagesPerCompetitor} used — you can&rsquo;t add any more pages.</div>
          )}

          {createState?.error ? <div className={styles.formError}>{createState.error}</div> : null}
        </div>

        <div className={styles.efoot}>
          {errorCount > 0 ? (
            <span className={styles.footErr}>Fix {errorCount} row{errorCount === 1 ? "" : "s"} to continue</span>
          ) : (
            <span className={styles.sub}>Snapshots run the moment you start.</span>
          )}
          <StartButton disabled={!canSubmit} />
        </div>
      </form>
    );
  }

  if (phase === "edit") {
    const ehead = (
      <div className={styles.ehead}>
        <CompetitorAvatar url={toFull(rows[0]?.url ?? "")} name={name || "?"} className={styles.efav} />
        <div className={styles.etitle}>Set up {name || "competitor"}</div>
        <span className={styles.eheadCount}>
          {planLabel} · {filledRows.length || rows.length} of {pagesPerCompetitor} page
          {pagesPerCompetitor === 1 ? "" : "s"}
        </span>
      </div>
    );
    return editView(ehead);
  }

  if (phase === "manual") {
    return editView(searchHeader("manual"));
  }

  // ---------- search phase ----------
  function searchHeader(active: "search" | "manual") {
    return (
      <>
        <div className={styles.chead}>
          <div className={styles.cheadLeft}>
            <div>
              <div className={styles.ctitle}>Add a competitor</div>
              <div className={styles.sub}>{planLabel} · tracking {competitorCount} of {competitorCap} competitors</div>
            </div>
          </div>
          <div className={styles.cheadRight}>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">&#10005;</button>
          </div>
        </div>
        <div className={styles.tabs}>
          <button type="button" className={active === "search" ? styles.tabOn : styles.tab} onClick={() => setPhase("search")}>Search</button>
          <button type="button" className={active === "manual" ? styles.tabOn : styles.tab} onClick={goManual}>Add manually</button>
        </div>
      </>
    );
  }

  const results = searchState?.status === "ok" ? searchState.result.competitors : [];
  const noMatches = searchState?.status === "error" && searchState.kind === "no-results";

  return (
    <div className={styles.card}>
      {searchHeader("search")}
      <div className={styles.searchBody}>
        <form action={searchAction} className={styles.searchForm}>
          <span className={styles.flabel}>Your company or website</span>
          <div className={styles.searchRow}>
            <div className={styles.fld} style={{ flex: 1 }}>
              <input
                className={styles.textInput}
                name="company"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. yourcompany.com"
                autoFocus
              />
            </div>
            <FindButton compact={results.length > 0 || noMatches} />
          </div>
          {!searching && results.length === 0 && !noMatches ? (
            <div className={styles.sub} style={{ marginTop: 10 }}>
              We&rsquo;ll find companies competing with you — pick any to start tracking.
            </div>
          ) : null}
        </form>

        {searching ? (
          <div className={styles.results}>
            <div className={styles.sub}>Searching for companies like yours…</div>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.skelCard}>
                <span className={styles.skelFav} />
                <div className={styles.skelLines}>
                  <span className={styles.skel} style={{ width: 130 }} />
                  <span className={styles.skel} style={{ width: 90, opacity: 0.7 }} />
                  <span className={styles.skel} style={{ width: 210, opacity: 0.55 }} />
                </div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className={styles.results}>
            <div className={styles.sub}>{results.length} match{results.length === 1 ? "" : "es"}</div>
            {results.map((c, i) => (
              <div key={`${c.name}-${i}`} className={styles.resultCard}>
                <CompetitorAvatar url={c.url} name={c.name} className={styles.resultFav} />
                <div className={styles.resultMain}>
                  <div className={styles.resultName}>{c.name}</div>
                  {c.url ? <div className={styles.resultDomain}>{canon(c.url)}</div> : null}
                  {c.why ? <div className={styles.resultWhy}>{c.why}</div> : null}
                </div>
                <button
                  type="button"
                  className={styles.secBtn}
                  onClick={() => selectResult(c.name, c.url || c.name)}
                  disabled={!c.url}
                >
                  Select
                </button>
              </div>
            ))}
            <div className={styles.manualLink}>
              <button type="button" className={styles.linkBtn} onClick={goManual}>Not seeing it? Add manually instead →</button>
            </div>
          </div>
        ) : noMatches ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No matches for &ldquo;{query}&rdquo;</div>
            <p className={styles.emptyText}>Try a different name or the company&rsquo;s domain. You can also add it by hand.</p>
            <button type="button" className={styles.secBtn} onClick={goManual}>Add manually instead</button>
          </div>
        ) : searchState?.status === "error" ? (
          <div className={styles.empty}>
            <p className={styles.emptyText}>{searchState.message}</p>
            <button type="button" className={styles.secBtn} onClick={goManual}>Add manually instead</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
