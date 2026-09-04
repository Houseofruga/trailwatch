"use client";

import { useEffect } from "react";
import { ErrorState, HomeLink } from "@/components/ErrorState";
import styles from "@/components/ErrorState.module.css";

// App-scoped error boundary: an error inside the authed area keeps the sidebar
// (rendered by the layout, which sits above this boundary) and swaps only the
// content for a branded retry, rather than blanking the whole shell.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong"
      body="This page hit a snag loading your data. It's usually temporary — try again in a moment."
      action={
        <>
          <button type="button" className={styles.button} onClick={reset}>
            Try again
          </button>
          <HomeLink />
        </>
      }
    />
  );
}
