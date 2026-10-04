"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { BETA_CONFIG } from "@/features/beta/config";
import { AuthShell } from "@/features/auth/AuthShell";

// Root error boundary: without it, a thrown server error renders React's bare
// "Application error" screen. Same card as the 404, with a retry.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AuthShell>
      <Card>
        <EmptyState
          art="radar"
          title="Something went wrong"
          actions={
            <>
              <Button variant="primary" onClick={reset}>
                Try again
              </Button>
              <Button href="/">Go to TrailWatch</Button>
            </>
          }
        >
          That page didn&rsquo;t load. It&rsquo;s usually a brief hiccup, so try again. If it keeps happening, email {BETA_CONFIG.founderEmail}.
        </EmptyState>
      </Card>
    </AuthShell>
  );
}
