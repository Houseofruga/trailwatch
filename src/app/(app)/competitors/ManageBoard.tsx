"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AddPageDialog } from "@/components/AddPageDialog";
import type { CompetitorRow } from "@/features/competitors/queries";
import { deleteCompetitor, deletePage, togglePageActive } from "@/features/competitors/actions";
import { originOf } from "@/features/competitors/domain";
import { checkPageNow } from "@/features/checks/actions";
import toastStyles from "@/components/Toast.module.css";
import styles from "./page.module.css";

type PendingDelete =
  | { kind: "competitor"; id: string; name: string; pageCount: number }
  | { kind: "page"; id: string; competitorName: string; label: string };

type AddingPageFor = { competitorId: string; competitorName: string; existingDomain: string; slotsLeft: number };

export function ManageBoard({
  competitors,
  pagesPerCompetitor,
}: {
  competitors: CompetitorRow[];
  pagesPerCompetitor: number;
}) {
  const [openMenuPageId, setOpenMenuPageId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [addingPageFor, setAddingPageFor] = useState<AddingPageFor | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div className={styles.list}>
      {competitors.map((c) => {
        const canAddPage = c.pages.length < pagesPerCompetitor;

        return (
          <section key={c.id} className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardHeadLeft}>
                <div className={styles.avatar}>{c.name.slice(0, 2).toUpperCase()}</div>
                <span className={styles.compName}>{c.name}</span>
                <span className={styles.pageCount}>
                  {c.pages.length} of {pagesPerCompetitor} pages
                </span>
              </div>
              <div className={styles.cardHeadRight}>
                {canAddPage ? (
                  <button
                    type="button"
                    className={styles.addPage}
                    onClick={() =>
                      setAddingPageFor({
                        competitorId: c.id,
                        competitorName: c.name,
                        existingDomain: originOf(c.pages[0]?.url ?? "") ?? "",
                        slotsLeft: pagesPerCompetitor - c.pages.length,
                      })
                    }
                  >
                    + Add page
                  </button>
                ) : (
                  <Link href={`/competitors/add?for=${c.id}`} className={styles.atLimit}>
                    Upgrade to add more pages
                  </Link>
                )}
                <Link href={`/competitors/${c.id}/edit`} className={styles.editComp}>
                  Edit
                </Link>
                <button
                  type="button"
                  className={styles.deleteComp}
                  onClick={() =>
                    setPendingDelete({ kind: "competitor", id: c.id, name: c.name, pageCount: c.pages.length })
                  }
                >
                  Delete competitor
                </button>
              </div>
            </div>

            {c.pages.map((p) => (
              <div key={p.id} className={styles.row}>
                <div className={styles.rowLabel}>{p.label}</div>
                <a href={p.url} target="_blank" rel="noreferrer" className={styles.rowUrl}>
                  <span className={styles.rowUrlText}>{p.url}</span>
                  <span className={styles.rowUrlIcon}>&#8599;</span>
                </a>
                <div className={styles.rowActions}>
                  {p.isActive ? (
                    <span className={styles.badgeActive}>Checking daily</span>
                  ) : (
                    <span className={styles.badgePaused}>Paused</span>
                  )}
                  <div className={styles.menuWrap}>
                    <button
                      type="button"
                      className={styles.menuBtn}
                      onClick={() => setOpenMenuPageId((cur) => (cur === p.id ? null : p.id))}
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
                            const nextActive = !p.isActive;
                            void togglePageActive(p.id, nextActive).then(() =>
                              setToast(`${c.name} ${p.label.toLowerCase()} ${nextActive ? "resumed" : "paused"}`),
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
                            setPendingDelete({ kind: "page", id: p.id, competitorName: c.name, label: p.label });
                          }}
                        >
                          Delete page
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </section>
        );
      })}

      {pendingDelete?.kind === "competitor" ? (
        <ConfirmDialog
          title={`Delete ${pendingDelete.name}?`}
          body={`This removes ${pendingDelete.pageCount} tracked page${pendingDelete.pageCount === 1 ? "" : "s"} and everything we've recorded about them. Pausing keeps the history if you only need a break.`}
          cta={`Delete ${pendingDelete.name}`}
          onConfirm={() => deleteCompetitor(pendingDelete.id)}
          onClose={() => setPendingDelete(null)}
        />
      ) : null}

      {pendingDelete?.kind === "page" ? (
        <ConfirmDialog
          title="Delete this page?"
          body={`We'll stop checking ${pendingDelete.competitorName}'s ${pendingDelete.label.toLowerCase()} page and its recorded changes go with it. You can add the URL again later.`}
          cta="Delete page"
          onConfirm={() => deletePage(pendingDelete.id).then(() => setToast("Page deleted"))}
          onClose={() => setPendingDelete(null)}
        />
      ) : null}

      {addingPageFor ? (
        <AddPageDialog
          competitorId={addingPageFor.competitorId}
          competitorName={addingPageFor.competitorName}
          existingDomain={addingPageFor.existingDomain}
          slotsLeft={addingPageFor.slotsLeft}
          pagesPerCompetitor={pagesPerCompetitor}
          onClose={() => setAddingPageFor(null)}
        />
      ) : null}

      {toast ? <div className={toastStyles.toast}>{toast}</div> : null}
    </div>
  );
}
