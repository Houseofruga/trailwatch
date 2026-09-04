"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ErrorState";
import styles from "@/components/ErrorState.module.css";
import "@/styles/tokens.css";

// Last-resort boundary: catches errors in the root layout itself, which the
// normal error.tsx sits below and can't cover. It replaces the whole document,
// so it must render its own <html>/<body>. Fonts aren't loaded here, so text
// falls back to system-ui (the token color palette is imported above).
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "var(--bg)" }}>
        <ErrorState
          title="Something went wrong"
          body="The app hit an unexpected error. Reloading usually clears it."
          action={
            <button type="button" className={styles.button} onClick={reset}>
              Reload
            </button>
          }
        />
      </body>
    </html>
  );
}
