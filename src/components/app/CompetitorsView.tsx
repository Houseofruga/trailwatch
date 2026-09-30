"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconPlus } from "@/components/ui/icons";
import { IndexTable, type Row } from "@/components/ui/IndexTable";
import { Tooltip } from "@/components/ui/Overlay";
import { PageBody, PageHeader } from "@/components/ui/Page";
import { ago, count } from "@/features/appData/format";
import type { CompetitorRow } from "@/features/appData/types";
import { AddCompetitorModal } from "./AddCompetitorModal";
import styles from "./CompetitorsView.module.css";

const BETA_LIMIT = 10;

export function StatusBadge({ c }: { c: Pick<CompetitorRow, "status" | "statusReason"> }) {
  if (c.status === "pages_only") return <Badge tone="neutral">Pages only</Badge>;
  if (c.status === "cant_reach")
    return c.statusReason ? (
      <Tooltip text={c.statusReason} align="end">
        <Badge tone="attention">Can&rsquo;t reach</Badge>
      </Tooltip>
    ) : (
      <Badge tone="attention">Can&rsquo;t reach</Badge>
    );
  return <Badge tone="success">Watching</Badge>;
}

export function CompetitorsView({
  competitors,
  loading,
  error,
}: {
  competitors: CompetitorRow[];
  loading?: boolean;
  error?: boolean;
}) {
  const [modal, setModal] = useState(false);

  const rows: Row[] = competitors.map((c) => {
    const store = (
      <span className={styles.store}>
        <Avatar name={c.name} size={28} src={c.favicon} />
        <span className={styles.storeText}>
          <Link href={`/competitors/${c.id}`} className={styles.storeName}>
            {c.name}
          </Link>
          <span className={styles.domain}>{c.domain}</span>
        </span>
      </span>
    );
    return {
      id: c.id,
      cells: [
        store,
        count(c.products),
        count(c.onSale),
        count(c.moves7d),
        <span key="l" className={styles.muted}>
          {ago(c.lastCheckedAt)}
        </span>,
        <StatusBadge key="s" c={c} />,
      ],
      mobile: (
        <>
          {store}
          <div className={styles.mobileMeta}>
            <StatusBadge c={c} />
            <span>{c.products == null ? "Pages only" : `${count(c.products)} products`}</span>
            <span aria-hidden="true">·</span>
            <span>{c.moves7d} moves this week</span>
          </div>
        </>
      ),
    };
  });

  const addButton = (
    <Button variant="primary" icon={<IconPlus />} onClick={() => setModal(true)}>
      Add competitor
    </Button>
  );

  return (
    <PageBody>
      <PageHeader
        title="Competitors"
        badges={competitors.length > 0 ? <Badge>{`${competitors.length} of ${BETA_LIMIT} (beta limit)`}</Badge> : null}
        actions={addButton}
      />

      {competitors.length === 0 && !loading && !error ? (
        <Card>
          <EmptyState art="store" title="Add your first competitor" actions={addButton}>
            Add a store you compete with. We&rsquo;ll read their catalog and key pages, then tell you when they move.
          </EmptyState>
        </Card>
      ) : (
        <Card flush>
          <IndexTable
            columns={[
              { label: "Store" },
              { label: "Products", width: 110, align: "right" },
              { label: "On sale", width: 100, align: "right" },
              { label: "Moves (7 days)", width: 130, align: "right" },
              { label: "Last checked", width: 130 },
              { label: "Status", width: 130 },
            ]}
            rows={error ? [] : rows}
            loading={loading}
            loadingLabel="Loading competitors…"
            error={
              error ? (
                <Banner tone="critical" title="We couldn't load your competitors" actions={<Button onClick={() => window.location.reload()}>Try again</Button>}>
                  Check your connection and try again.
                </Banner>
              ) : undefined
            }
          />
        </Card>
      )}

      {competitors.length > 0 ? <p className={styles.footnote}>We check every competitor every 2 hours.</p> : null}

      <AddCompetitorModal
        open={modal}
        onClose={() => setModal(false)}
        remaining={BETA_LIMIT - competitors.length}
      />
    </PageBody>
  );
}
