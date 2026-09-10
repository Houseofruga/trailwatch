"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CompetitorSetup } from "./CompetitorSetup";
import styles from "./AddCompetitorTakeover.module.css";

type ExistingUrl = { url: string; competitor: string };

/**
 * Chrome around the Add Competitor takeover. `overlay` (the intercepting @modal
 * route) scrims the page behind and closes with browser-back; `page` (a direct
 * visit / refresh) is a plain centered container that closes to /competitors.
 */
export function AddCompetitorTakeover({
  variant,
  plan,
  competitorCount,
  competitorCap,
  pagesPerCompetitor,
  existingUrls,
}: {
  variant: "overlay" | "page";
  plan: "free" | "paid";
  competitorCount: number;
  competitorCap: number;
  pagesPerCompetitor: number;
  existingUrls: ExistingUrl[];
}) {
  const router = useRouter();
  const overlay = variant === "overlay";

  function close() {
    if (overlay && window.history.length > 1) router.back();
    else router.push("/competitors");
  }

  useEffect(() => {
    if (!overlay) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay]);

  const setup = (
    <CompetitorSetup
      plan={plan}
      competitorCount={competitorCount}
      competitorCap={competitorCap}
      pagesPerCompetitor={pagesPerCompetitor}
      existingUrls={existingUrls}
      onClose={close}
    />
  );

  if (!overlay) {
    return (
      <div className={styles.pageWrap}>
        <div className={styles.center}>{setup}</div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} role="presentation" onClick={close}>
      <div className={styles.center} onClick={(e) => e.stopPropagation()}>
        {setup}
      </div>
    </div>
  );
}
