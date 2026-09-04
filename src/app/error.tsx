"use client";

import { useEffect } from "react";
import { ErrorState, HomeLink } from "@/components/ErrorState";
import styles from "@/components/ErrorState.module.css";

// Root error boundary. Without this, any thrown error in a server component
// (a transient Supabase blip, a failed query) renders React's bare
// "Application error" screen. This gives a branded page with a retry.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="Something went wrong"
      body="That page hit a snag on our end. It's usually temporary — try again, or head back to your dashboard."
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
