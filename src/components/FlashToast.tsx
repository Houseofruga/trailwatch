"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import styles from "./Toast.module.css";

/**
 * Server actions redirect with `?flash=<message>` after a mutation (matches
 * the design's toast). Each page load is a fresh mount, so the flash value is
 * captured once as initial state rather than synced via an effect.
 */
export function FlashToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState(() => searchParams.get("flash"));

  useEffect(() => {
    if (!message) return;

    const params = new URLSearchParams(searchParams);
    params.delete("flash");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });

    const timer = setTimeout(() => setMessage(null), 2200);
    return () => clearTimeout(timer);
    // Runs once per mount, using the flash value captured at init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!message) return null;
  return <div className={styles.toast}>{message}</div>;
}
