"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CloseIcon } from "./icons";
import styles from "./ChangeDetailModal.module.css";

// Full-screen overlay panel (12px gap all sides) that hosts the change detail when
// it's reached by in-app navigation via the intercepting @modal route. Closing uses
// real browser-back with a fallback (same rule as BackLink), so it returns the user
// to wherever they opened it from. Escape and clicking the scrim also close it, and
// background scroll is locked while open.
export function ChangeDetailModal({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function close() {
    if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // close is stable enough for the modal's lifetime; router is referentially stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.overlay} role="presentation" onClick={close}>
      <div className={styles.panel} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.headLeft}>{header}</div>
          <button type="button" className={styles.close} onClick={close} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
