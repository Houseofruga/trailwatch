"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageBody, PageHeader } from "@/components/ui/Page";
import { useToast } from "@/components/ui/Toast";
import { restoreOpportunity } from "@/features/appData/actions";
import { shortDate } from "@/features/appData/format";
import type { OpportunityView } from "@/features/opportunities/queries";
import { KIND_LABEL } from "./OpportunitiesView";
import styles from "./OpportunitiesView.module.css";

/** "Show dismissed" (DESIGN 11-opps 11d): dismissed and not-relevant items, each with Restore. */
export function DismissedOpportunitiesView({ items, demo }: { items: OpportunityView[]; demo?: boolean }) {
  const toast = useToast();
  const [restored, setRestored] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const shown = items.filter((o) => !restored.has(o.id));

  const restore = (o: OpportunityView) => {
    setRestored((prev) => new Set(prev).add(o.id));
    if (demo) return toast("Restored to your opportunities.");
    startTransition(async () => {
      const res = await restoreOpportunity(o.id);
      if (res.ok) toast("Restored to your opportunities.");
      else {
        setRestored((prev) => {
          const next = new Set(prev);
          next.delete(o.id);
          return next;
        });
        toast("Couldn't restore that. Try again.", { error: true });
      }
    });
  };

  return (
    <PageBody medium>
      <PageHeader
        title="Dismissed opportunities"
        breadcrumb={{ href: "/opportunities", label: "Opportunities" }}
        subtitle="Dismissed items come back only if the evidence gets much stronger. “Not relevant” items never come back unless you restore them."
      />
      <Card flush>
        {shown.length === 0 ? (
          <EmptyState art="filter" title="Nothing dismissed">
            Opportunities you dismiss or mark as not relevant show up here.
          </EmptyState>
        ) : (
          <ul className={styles.rows}>
            {shown.map((o) => (
              <li key={o.id} className={styles.dismissedRow}>
                <div className={styles.dismissedText}>
                  <span className={styles.dismissedMeta}>
                    <Badge>{KIND_LABEL[o.kind]}</Badge>
                    <span>
                      {o.status === "not_relevant"
                        ? "Not relevant · won’t come back"
                        : `Dismissed${o.dismissedAt ? ` ${shortDate(o.dismissedAt)}` : ""}`}
                    </span>
                  </span>
                  <span className={styles.dismissedNoticed}>{o.noticed}</span>
                </div>
                <Button onClick={() => restore(o)}>Restore</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageBody>
  );
}
