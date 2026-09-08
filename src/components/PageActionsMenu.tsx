"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditPageDialog } from "@/components/EditPageDialog";
import { deletePage, togglePageActive } from "@/features/competitors/actions";
import { checkPageNow } from "@/features/checks/actions";
import toastStyles from "@/components/Toast.module.css";
import styles from "./PageActionsMenu.module.css";

/**
 * The per-page ⋮ menu — Check now / Edit URL / Pause–Resume / Delete page — with
 * its own open state, outside-click/Escape close, confirm + edit dialogs and a
 * transient toast. Lifted out of the Competitors board so the redesigned
 * dashboard rows and the competitor-detail page can share one implementation.
 *
 * The server actions it calls all `revalidatePath`, so the surrounding server
 * components refresh on their own — no explicit router.refresh() needed.
 */
export function PageActionsMenu({
  pageId,
  label,
  url,
  siblingDomain,
  isActive,
  competitorName,
}: {
  pageId: string;
  label: string;
  url: string;
  /** The competitor's other pages' domain (for the Edit-URL same-site check); null if this is the only page. */
  siblingDomain: string | null;
  isActive: boolean;
  competitorName: string;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (!(event.target as HTMLElement).closest("[data-page-menu]")) setOpen(false);
    }
    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div className={styles.menuWrap} data-page-menu>
      <button
        type="button"
        className={styles.menuBtn}
        aria-label="Page actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        &#8942;
      </button>

      {open ? (
        <div className={styles.menu} role="menu">
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => {
              setOpen(false);
              void checkPageNow(pageId).then((message) => setToast(message));
            }}
          >
            Check now
          </button>
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => {
              setOpen(false);
              setEditing(true);
            }}
          >
            Edit URL
          </button>
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => {
              setOpen(false);
              const nextActive = !isActive;
              void togglePageActive(pageId, nextActive).then(() =>
                setToast(`${competitorName} ${label.toLowerCase()} ${nextActive ? "resumed" : "paused"}`),
              );
            }}
          >
            {isActive ? "Pause checking" : "Resume checking"}
          </button>
          <button
            type="button"
            className={styles.menuItemDanger}
            onClick={() => {
              setOpen(false);
              setConfirmingDelete(true);
            }}
          >
            Delete page
          </button>
        </div>
      ) : null}

      {editing ? (
        <EditPageDialog
          pageId={pageId}
          initialUrl={url}
          initialLabel={label}
          siblingDomain={siblingDomain}
          onClose={() => setEditing(false)}
          onSaved={() => setToast("Page updated")}
        />
      ) : null}

      {confirmingDelete ? (
        <ConfirmDialog
          title="Delete this page?"
          body={`We'll stop checking ${competitorName}'s ${label.toLowerCase()} page and its recorded changes go with it. You can add the URL again later.`}
          cta="Delete page"
          onConfirm={() => deletePage(pageId).then(() => setToast("Page deleted"))}
          onClose={() => setConfirmingDelete(false)}
        />
      ) : null}

      {toast ? <div className={toastStyles.toast}>{toast}</div> : null}
    </div>
  );
}
