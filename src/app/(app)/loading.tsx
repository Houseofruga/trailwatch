import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Feedback";
import { PageBody } from "@/components/ui/Page";

// Shown on navigation while a page's data loads. The frame (layout.tsx) stays;
// no skeletons in this design (UX_SPEC.md §3), just a labelled spinner.
export default function AppLoading() {
  return (
    <PageBody>
      <Card>
        <Spinner label="Loading…" />
      </Card>
    </PageBody>
  );
}
