"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AddPageDialog } from "@/components/AddPageDialog";
import { EditPageDialog } from "@/components/EditPageDialog";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";
import { ExternalLinkIcon, PencilIcon, PlusIcon, TrashIcon } from "@/components/icons";
import type { CompetitorRow } from "@/features/competitors/queries";
import type { PageProfile } from "@/features/insights/types";
import type { InitialHistory } from "@/features/backfill/types";
import { deleteCompetitor, deletePage, togglePageActive } from "@/features/competitors/actions";
import { originOf } from "@/features/competitors/domain";
import { checkPageNow } from "@/features/checks/actions";
import { formatFullDate, timeAgo } from "@/app/(app)/dashboard/dashboardFeed";
import { PageIntel } from "../PageIntel";
import { EditCompetitorDialog } from "./EditCompetitorDialog";
import toastStyles from "@/components/Toast.module.css";
import styles from "../page.module.css";

type Page = CompetitorRow["pages"][number];
type PendingDelete =
  | { kind: "competitor" }
  | { kind: "page"; id: string; label: string };
type EditingPage = { id: string; url: string; label: string; siblingDomain: string | null };

// "3 Feb 2026 · 2:14 PM" — the "Tracking since" stamp on each page card.
function trackingSince(iso: string): string {
  const time = new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${formatFullDate(iso)} · ${time}`;
}

/**
 * Competitor detail (IA redesign §3): the old per-competitor board block on its
 * own page. Header identity + actions, a templated summary line, then one card
 * per page — type + URL, status, a "Tracking since / N changes" meta strip, and
 * the baseline + history disclosures (PageIntel). Broken pages surface a "can't
 * reach" strip with an Edit-URL fix instead of the disclosures.
 */
export function CompetitorDetail({
  competitor,
  pagesPerCompetitor,
  plan,
  otherUrls,
  summaryLine,
  initialProfiles,
  initialHistories,
  now,
}: {
  competitor: CompetitorRow;
  pagesPerCompetitor: number;
  plan: "free" | "paid";
  otherUrls: { url: string; competitor: string }[];
  summaryLine: string;
  initialProfiles: Record<string, PageProfile | null>;
  initialHistories: Record<string, InitialHistory>;
  now: number;
}) {
  const router = useRouter();
  const [openMenuPageId, setOpenMenuPageId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [addingPage, setAddingPage] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState(false);
  const [editingPage, setEditingPage] = useState<EditingPage | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!openMenuPageId) return;
    function onDown(event: MouseEvent) {
      if (!(event.target as HTMLElement).closest("[data-page-menu]")) setOpenMenuPageId(null);
    }
    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenuPageId(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [openMenuPageId]);

  const firstUrl = competitor.pages[0]?.url ?? "";
  const domain = originOf(firstUrl);

  function openEdit(p: Page) {
    const sibling = competitor.pages.find((other) => other.id !== p.id);
    setEditingPage({ id: p.id, url: p.url, label: p.label, siblingDomain: sibling ? originOf(sibling.url) : null });
  }

  return (
    <div className={styles.dtlWrap}>
      <BackLink href="/competitors" />

      <div className={styles.dtlHeader}>
        <div className={styles.dtlIdentity}>
          <CompetitorAvatar url={firstUrl} name={competitor.name} className={styles.dtlAvatar} />
          <div>
            <h1 className={styles.dtlName}>{competitor.name}</h1>
            {domain ? (
              <a href={firstUrl} target="_blank" rel="noreferrer" className={styles.dtlDomain}>
                <span className={styles.dtlDomainText}>{domain}</span>
                <span className={styles.dtlDomainIcon}>
                  <ExternalLinkIcon />
                </span>
              </a>
            ) : null}
          </div>
        </div>

        <div className={styles.dtlActions}>
          <button type="button" className={styles.dtlAddPage} onClick={() => setAddingPage(true)}>
            <PlusIcon size={13} />
            Add page
          </button>
          <button type="button" className={styles.dtlBtn} onClick={() => setEditingCompetitor(true)}>
            <PencilIcon />
            Edit
          </button>
          <button type="button" className={styles.dtlBtnDanger} onClick={() => setPendingDelete({ kind: "competitor" })}>
            <TrashIcon />
            Delete competitor
          </button>
        </div>
      </div>

      {summaryLine ? <p className={styles.dtlSummary}>{summaryLine}</p> : null}

      <div className={styles.dtlPages}>
        {competitor.pages.map((p) => {
          const paused = !p.isActive;
          const broken = p.isActive && (p.lastCheckStatus === "broken" || p.lastCheckStatus === "error");

          return (
            <div key={p.id} className={broken ? `${styles.pgCard} ${styles.pgCardBroken}` : styles.pgCard}>
              <div className={styles.pgHead}>
                <div className={styles.pgHeadLeft}>
                  <span className={styles.pgType}>{p.label}</span>
                  <a href={p.url} target="_blank" rel="noreferrer" className={styles.pgUrl}>
                    <span className={styles.pgUrlText}>{p.url.replace(/^https?:\/\//, "")}</span>
                    <span className={styles.pgUrlIcon}>
                      <ExternalLinkIcon />
                    </span>
                  </a>
                </div>
                <div className={styles.pgHeadRight}>
                  {paused ? (
                    <span className={styles.pgBadgePaused}>Paused</span>
                  ) : broken ? (
                    <span className={styles.pgBadgeError}>
                      <span className={styles.pgBadgeSquare} aria-hidden="true" />
                      {p.lastCheckStatus === "broken" ? "Can’t reach" : "Check failed"}
                    </span>
                  ) : (
                    <span className={styles.pgBadgeOk}>
                      <span className={styles.pgBadgeDot} aria-hidden="true" />
                      Checking daily
                    </span>
                  )}
                  <div className={styles.menuWrap} data-page-menu>
                    <button
                      type="button"
                      className={openMenuPageId === p.id ? `${styles.pgMenuBtn} ${styles.pgMenuBtnOpen}` : styles.pgMenuBtn}
                      onClick={() => setOpenMenuPageId((cur) => (cur === p.id ? null : p.id))}
                      aria-label="Page actions"
                    >
                      &#8942;
                    </button>
                    {openMenuPageId === p.id ? (
                      <div className={styles.menu} role="menu">
                        <button
                          type="button"
                          className={styles.menuItem}
                          onClick={() => {
                            setOpenMenuPageId(null);
                            void checkPageNow(p.id).then((message) => setToast(message));
                          }}
                        >
                          Check now
                        </button>
                        <button
                          type="button"
                          className={styles.menuItem}
                          onClick={() => {
                            setOpenMenuPageId(null);
                            openEdit(p);
                          }}
                        >
                          Edit URL
                        </button>
                        <button
                          type="button"
                          className={styles.menuItem}
                          onClick={() => {
                            setOpenMenuPageId(null);
                            const nextActive = !p.isActive;
                            void togglePageActive(p.id, nextActive).then(() =>
                              setToast(`${competitor.name} ${p.label.toLowerCase()} ${nextActive ? "resumed" : "paused"}`),
                            );
                          }}
                        >
                          {p.isActive ? "Pause checking" : "Resume checking"}
                        </button>
                        <button
                          type="button"
                          className={styles.menuItemDanger}
                          onClick={() => {
                            setOpenMenuPageId(null);
                            setPendingDelete({ kind: "page", id: p.id, label: p.label });
                          }}
                        >
                          Delete page
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className={styles.pgMeta}>
                <span className={styles.pgMetaItem}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.1" />
                    <path d="M6 3.4V6l1.9 1.1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Tracking since <span className={styles.pgMetaDate}>{trackingSince(p.createdAt)}</span>
                </span>
                <span className={styles.pgMetaItem}>
                  <span className={styles.pgMetaDot} aria-hidden="true" />
                  <span className={styles.pgMetaStrong}>
                    {p.meaningfulTotal} change{p.meaningfulTotal === 1 ? "" : "s"}
                  </span>{" "}
                  since adding
                </span>
              </div>

              {broken ? (
                <div className={styles.pgErrorStrip}>
                  <span className={styles.pgErrorText}>
                    Not tracking — {p.lastCheckError ?? "the last check couldn’t reach this page"}
                    {p.lastCheckedAt ? ` · last reached ${timeAgo(p.lastCheckedAt, now)}` : null}
                  </span>
                  <button type="button" className={styles.pgErrorFix} onClick={() => openEdit(p)}>
                    Edit URL
                  </button>
                </div>
              ) : paused ? null : (
                <div className={styles.pgBody}>
                  <PageIntel
                    pageId={p.id}
                    flush
                    initialProfile={initialProfiles[p.id] ?? null}
                    initialHistory={initialHistories[p.id] ?? null}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pendingDelete?.kind === "competitor" ? (
        <ConfirmDialog
          title={`Delete ${competitor.name}?`}
          body={`This removes ${competitor.pages.length} tracked page${competitor.pages.length === 1 ? "" : "s"} and everything we've recorded about them. Pausing keeps the history if you only need a break.`}
          cta={`Delete ${competitor.name}`}
          onConfirm={async () => {
            await deleteCompetitor(competitor.id);
            router.push("/competitors");
          }}
          onClose={() => setPendingDelete(null)}
        />
      ) : null}

      {pendingDelete?.kind === "page" ? (
        <ConfirmDialog
          title="Delete this page?"
          body={`We'll stop checking ${competitor.name}'s ${pendingDelete.label.toLowerCase()} page and its recorded changes go with it. You can add the URL again later.`}
          cta="Delete page"
          onConfirm={() => deletePage(pendingDelete.id).then(() => setToast("Page deleted"))}
          onClose={() => setPendingDelete(null)}
        />
      ) : null}

      {addingPage ? (
        <AddPageDialog
          competitorId={competitor.id}
          competitorName={competitor.name}
          competitorUrl={firstUrl}
          existingUrls={competitor.pages.map((p) => p.url)}
          currentCount={competitor.pages.length}
          pagesPerCompetitor={pagesPerCompetitor}
          plan={plan}
          onClose={() => setAddingPage(false)}
        />
      ) : null}

      {editingCompetitor ? (
        <EditCompetitorDialog
          competitorId={competitor.id}
          initialName={competitor.name}
          initialPages={competitor.pages.map((p) => ({ id: p.id, url: p.url, label: p.label, pageType: p.pageType }))}
          otherUrls={otherUrls}
          pagesPerCompetitor={pagesPerCompetitor}
          plan={plan}
          onClose={() => setEditingCompetitor(false)}
        />
      ) : null}

      {editingPage ? (
        <EditPageDialog
          pageId={editingPage.id}
          initialUrl={editingPage.url}
          initialLabel={editingPage.label}
          siblingDomain={editingPage.siblingDomain}
          onClose={() => setEditingPage(null)}
          onSaved={() => setToast("Page updated")}
        />
      ) : null}

      {toast ? <div className={toastStyles.toast}>{toast}</div> : null}
    </div>
  );
}
