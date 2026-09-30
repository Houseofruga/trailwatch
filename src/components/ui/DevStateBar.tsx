"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./DevStateBar.module.css";

/**
 * Development-only switcher for reviewing every designed state of a screen
 * (sets `?state=`, keeping other params). Renders nothing in production builds.
 */
export function DevStateBar({ states, current }: { states: readonly string[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <div className={styles.bar} role="region" aria-label="Design review states (development only)">
      <label htmlFor="dev-state">State</label>
      <select
        id="dev-state"
        value={current}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          next.set("state", e.target.value);
          router.replace(`${pathname}?${next}`, { scroll: false });
        }}
      >
        {states.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
