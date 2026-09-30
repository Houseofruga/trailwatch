"use client";

import { useEffect } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { PageBody } from "@/components/ui/Page";

// App-scoped error boundary: the frame (layout.tsx) stays; only the content
// swaps for a retry.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageBody>
      <Banner
        tone="critical"
        title="Something went wrong"
        actions={
          <>
            <Button onClick={reset}>Try again</Button>
            <Button variant="plainDark" href="/dashboard">
              Go to Home
            </Button>
          </>
        }
      >
        This page hit a snag loading your data. It&rsquo;s usually temporary; try again in a moment.
      </Banner>
    </PageBody>
  );
}
