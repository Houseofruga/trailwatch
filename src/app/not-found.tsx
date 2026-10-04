import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AuthShell } from "@/features/auth/AuthShell";

export const metadata: Metadata = { title: "Page not found" };

// 404 outside the app (unknown URLs, signed-out visitors): the centred card
// of Sign up / log in, in the pattern of 06-Competitor detail / not found.
export default function NotFound() {
  return (
    <AuthShell>
      <Card>
        <EmptyState
          art="search"
          title="We can’t find that page"
          actions={
            <Button variant="primary" href="/">
              Go to Trailwatch
            </Button>
          }
        >
          The link may be out of date, or the page has moved.
        </EmptyState>
      </Card>
    </AuthShell>
  );
}
