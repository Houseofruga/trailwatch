"use client";

import { useState, useTransition } from "react";
import { setDigestEnabled } from "./actions";
import styles from "@/app/(app)/settings/page.module.css";

export function DigestToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useState(enabled);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next); // optimistic
    startTransition(async () => {
      await setDigestEnabled(next);
    });
  }

  return (
    <div className={styles.toggleRow}>
      <span className={styles.toggleState}>
        {on ? "On — you'll get the Monday digest" : "Off — digest paused"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Weekly digest"
        onClick={toggle}
        disabled={pending}
        className={on ? styles.toggleOn : styles.toggle}
      >
        <span className={on ? styles.knobOn : styles.knob} />
      </button>
    </div>
  );
}
