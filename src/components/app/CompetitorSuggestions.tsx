"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { IconCheck, IconClock, IconPlus, IconSearch, SpinnerIcon } from "@/components/ui/icons";
import { suggestCompetitors, type SuggestResult } from "@/features/appData/actions";
import type { Suggestion } from "@/features/competitorFinder/suggest";
import styles from "./CompetitorSuggestions.module.css";

/** Design-review states (dev `?state=` only); live use leaves it unset. */
export type SuggestPreview = "ready" | "loading" | "none" | "failed" | "no-store";

type Row = Suggestion & { added?: boolean; isNew?: boolean; adding?: boolean; error?: string };

const MOCK: Suggestion[] = [
  { name: "Hearth & Pine", domain: "hearthandpine.com", why: "Sells duvets and sheet sets at similar prices." },
  { name: "Dewlane", domain: "dewlane.com", why: "Also sells linen bedding." },
  { name: "Northknot", domain: "northknot.com", why: "" },
  { name: "Oakgrove", domain: "oakgrove.co", why: "Sells throws and pillows like yours." },
];

const MOCK_RESULT: Record<SuggestPreview, SuggestResult | null> = {
  ready: { ok: true, suggestions: MOCK },
  loading: null,
  none: { ok: false, reason: "none", message: "We couldn't find Shopify stores that compete with yours. Add the ones you know above." },
  failed: { ok: false, reason: "error", message: "We couldn't search just now. Try again, or add stores you know above." },
  "no-store": { ok: false, reason: "no-store", message: "Add your store in Settings to get suggestions." },
};

/**
 * "Suggested competitors" (02b-Suggestions): Shopify stores like the user's own,
 * each added in one click. Shared by onboarding step 2 and the Add competitor
 * modal; the parent does the adding so its own list stays in step.
 */
export function CompetitorSuggestions({
  onAdd,
  full,
  hideWithoutStore,
  preview,
  className,
}: {
  onAdd: (domain: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  /** At the beta limit: Add buttons are disabled and Find more is hidden. */
  full: boolean;
  /** Onboarding: no own store (step 1 skipped) hides the whole block. */
  hideWithoutStore?: boolean;
  preview?: SuggestPreview;
  /** The divider above the block, which differs between onboarding and the modal. */
  className?: string;
}) {
  const [result, setResult] = useState<SuggestResult | null>(preview ? MOCK_RESULT[preview] : null);
  const [rows, setRows] = useState<Row[]>(preview === "ready" ? MOCK : []);
  const [findingMore, setFindingMore] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (preview) return;
    let live = true;
    void suggestCompetitors().then((res) => {
      if (!live) return;
      setResult(res);
      if (res.ok) setRows(res.suggestions);
    });
    return () => {
      live = false;
    };
  }, [preview]);

  const patch = (domain: string, change: Partial<Row>) =>
    setRows((list) => list.map((r) => (r.domain === domain ? { ...r, ...change } : r)));

  async function add(row: Row) {
    patch(row.domain, { adding: true, error: undefined });
    const res = preview ? ({ ok: true } as const) : await onAdd(row.domain);
    patch(row.domain, res.ok ? { adding: false, added: true } : { adding: false, error: res.error });
  }

  async function search(refresh: boolean) {
    setNote(null);
    if (refresh) setFindingMore(true);
    else setResult(null);
    const res = preview ? MOCK_RESULT.ready! : await suggestCompetitors({ refresh });
    setFindingMore(false);
    if (res.ok) {
      // Added stores drop out; anything we hadn't shown before is marked New.
      const before = new Set(rows.map((r) => r.domain));
      setRows(res.suggestions.map((s) => ({ ...s, isNew: refresh && !before.has(s.domain) })));
      setResult(res);
    } else if (refresh && rows.length > 0) {
      setNote(res.message);
    } else {
      setResult(res);
    }
  }

  if (result && !result.ok && result.reason === "no-store" && hideWithoutStore) return null;

  return (
    <section className={`${styles.section} ${className ?? ""}`}>
      <div className={styles.head}>
        <h2 className={styles.title}>Suggested competitors</h2>
        <p className={styles.sub}>Stores that sell products like yours. Add the ones you compete with.</p>
      </div>

      {result === null ? (
        <>
          <ul className={styles.list} aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className={styles.skeleton}>
                <div className={styles.skAvatar} />
                <div className={styles.skText}>
                  <div className={styles.skLine} />
                  <div className={styles.skLineShort} />
                </div>
                <div className={styles.skButton} />
              </li>
            ))}
          </ul>
          <p role="status" className={styles.status}>
            <SpinnerIcon size={14} tone="#616161" />
            Finding stores like yours. This takes a few seconds.
          </p>
        </>
      ) : !result.ok ? (
        result.reason === "error" || result.reason === "busy" ? (
          <Banner tone="critical" actions={<Button onClick={() => void search(false)}>Try again</Button>}>
            {result.message}
          </Banner>
        ) : (
          <div role="status" className={styles.message}>
            <span className={styles.messageIcon}>
              <IconSearch />
            </span>
            <div className={styles.messageBody}>
              {result.message}
              {result.reason === "no-store" ? (
                <span>
                  <Link href="/settings">Go to Settings</Link>
                </span>
              ) : null}
            </div>
          </div>
        )
      ) : (
        <>
          <ul className={styles.list} aria-label="Suggested competitors">
            {rows.map((r) => (
              <li key={r.domain} className={styles.row}>
                <Avatar name={r.name} size={32} domain={r.domain} />
                <div className={styles.text}>
                  <span className={styles.nameLine}>
                    <span className={styles.name}>
                      {r.name}
                      {r.isNew && !r.added ? <Badge tone="info">New</Badge> : null}
                    </span>
                    <span className={styles.domain}>{r.domain}</span>
                  </span>
                  {r.why ? <span className={styles.why}>{r.why}</span> : null}
                  {r.error ? <span className={styles.rowError}>{r.error}</span> : null}
                </div>
                {r.added ? (
                  <span role="status" className={styles.added}>
                    <span className={styles.addedDot}>
                      <IconCheck size={12} />
                    </span>
                    Added
                  </span>
                ) : (
                  <Button
                    icon={<IconPlus />}
                    aria-label={`Add ${r.name}`}
                    loading={r.adding}
                    disabled={full}
                    onClick={() => void add(r)}
                  >
                    Add
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {full ? null : (
            <div className={styles.more}>
              {findingMore ? (
                <>
                  <button type="button" disabled aria-busy="true" className={styles.finding}>
                    <SpinnerIcon size={15} tone="#616161" />
                    Finding more…
                  </button>
                  <span role="status" className={styles.note}>
                    This takes a few seconds.
                  </span>
                </>
              ) : (
                <>
                  <Button variant="plainDark" icon={<IconSearch />} onClick={() => void search(true)}>
                    Find more
                  </Button>
                  {note ? (
                    <span role="status" className={styles.note}>
                      <IconClock size={14} />
                      {note}
                    </span>
                  ) : null}
                </>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
