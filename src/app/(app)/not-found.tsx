import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageBody } from "@/components/ui/Page";

export const metadata: Metadata = { title: "Page not found" };

// 404 inside the app (the frame stays), in the pattern of 06-Competitor detail / not found.
export default function AppNotFound() {
  return (
    <PageBody>
      <Card>
        <EmptyState
          art="search"
          title="We can’t find that page"
          actions={
            <Button variant="primary" href="/dashboard">
              Go to Home
            </Button>
          }
        >
          The link may be out of date, or the page has moved. Your competitors and their moves are all still here.
        </EmptyState>
      </Card>
    </PageBody>
  );
}
