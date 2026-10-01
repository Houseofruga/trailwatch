"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { HomeState } from "@/app/(app)/dashboard/page";
import { Avatar, Thumbnail } from "@/components/ui/Avatar";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Stat } from "@/components/ui/Feedback";
import { SetupGuide } from "@/components/ui/Guides";
import { IconChevronDown, IconChevronUp, IconPlus } from "@/components/ui/icons";
import { IndexTable, type Row } from "@/components/ui/IndexTable";
import { PageBody, PageHeader } from "@/components/ui/Page";
import { FilterSelect } from "@/components/ui/Select";
import { briefingTime, money, when } from "@/features/appData/format";
import type { CompetitorRow, HomeSummary, Move } from "@/features/appData/types";
import { AddCompetitorModal } from "./AddCompetitorModal";
import { MoveIcon, PRIORITY_OPTIONS, PriorityBadge, TYPE_OPTIONS } from "./moveParts";
import styles from "./HomeView.module.css";

const PAGE_SIZE = 10;
const BETA_LIMIT = 10;

type Filters = { competitor: string; type: string; priority: string };
const NO_FILTERS: Filters = { competitor: "all", type: "all", priority: "all" };

export function HomeView({
  state,
  summary,
  moves,
  competitors,
}: {
  state: HomeState;
  summary: HomeSummary;
  moves: Move[];
  competitors: CompetitorRow[];
}) {
  const [modal, setModal] = useState(state === "add-competitor-modal");
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [filters, setFilters] = useState<Filters>(
    state === "filters-match-nothing" ? { competitor: "dewlane", type: "launch", priority: "high" } : NO_FILTERS,
  );
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Record<string, boolean>>({ m3: true });

  const loading = state === "loading";
  const error = state === "error";
  const setupDone = state === "busy-week" || (summary.setup.ownStore && summary.setup.competitor && summary.setup.alerts);

  const filtered = useMemo(
    () =>
      moves.filter(
        (m) =>
          (filters.competitor === "all" || m.competitorId === filters.competitor) &&
          (filters.type === "all" || m.kind === filters.type) &&
          (filters.priority === "all" || m.priority === filters.priority),
      ),
    [moves, filters],
  );
  const pageMoves = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const setFilter = (k: keyof Filters) => (v: string) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(0);
  };

  const rows: Row[] = pageMoves.map((m) => {
    const href = `/competitors/${m.competitorId}#move-${m.id}`;
    const expanded = !!open[m.id];
    const toggle = m.bundle ? (
      <button
        type="button"
        className={styles.expand}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Hide" : "Show"} the ${m.bundle.length} products`}
        onClick={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))}
      >
        {expanded ? <IconChevronUp /> : <IconChevronDown />}
      </button>
    ) : null;
    const bundle =
      m.bundle && expanded ? (
        <ul className={styles.bundle}>
          {m.bundle.map((b) => (
            <li key={b.title}>
              <Thumbnail />
              <span className={styles.bundleTitle}>{b.title}</span>
              <span className={styles.bundlePrice}>{money(b.price)}</span>
            </li>
          ))}
        </ul>
      ) : undefined;
    return {
      id: m.id,
      cells: [
        <div key="move" className={styles.moveCell}>
          <span className={styles.moveIcon}>
            <MoveIcon kind={m.kind} />
          </span>
          <span className={styles.moveText}>
            <Link href={href} className={styles.moveLink}>
              {m.summary}
            </Link>
            {toggle}
          </span>
        </div>,
        <span key="c" className={styles.competitor}>
          <Avatar name={m.competitorName} />
          {m.competitorName}
        </span>,
        <PriorityBadge key="p" priority={m.priority} />,
        <span key="w" className={styles.muted}>
          {when(m.at)}
        </span>,
      ],
      mobile: (
        <>
          <div className={styles.mobileTitle}>
            <Link href={href} className={styles.moveLink}>
              {m.summary}
            </Link>
            {toggle}
          </div>
          <div className={styles.mobileMeta}>
            <PriorityBadge priority={m.priority} />
            <span>{m.competitorName}</span>
            <span aria-hidden="true">·</span>
            <span>{when(m.at)}</span>
          </div>
        </>
      ),
      detail: bundle,
    };
  });

  const firstReport = competitors[0] ? `/competitors/${competitors[0].id}/report` : "/competitors";

  return (
    <PageBody>
      <PageHeader
        title="Home"
        actions={
          <Button variant="primary" icon={<IconPlus />} onClick={() => setModal(true)}>
            Add competitor
          </Button>
        }
      />

      {!setupDone && !guideDismissed ? (
        <SetupGuide
          onDismiss={() => setGuideDismissed(true)}
          tasks={[
            { label: "Add your store", done: summary.setup.ownStore },
            { label: "Add a competitor", done: summary.setup.competitor },
            {
              label: "Choose where alerts go",
              done: summary.setup.alerts,
              description: "Get big moves by email or Slack the moment we see them.",
              action: <Button href="/settings">Set up alerts</Button>,
            },
          ]}
        />
      ) : null}

      <div className={styles.stats}>
        <Card>
          <Stat label="Moves caught this month" value={summary.movesThisMonth} loading={loading} />
        </Card>
        <Card>
          <Stat label="High priority this week" value={summary.highThisWeek} loading={loading} />
        </Card>
        <Card>
          {summary.nextBriefing ? (
            <Stat
              label="Next briefing"
              size="sm"
              value={briefingTime(summary.nextBriefing.at, summary.nextBriefing.timeZone)}
              sub={`to ${summary.nextBriefing.to}`}
              loading={loading}
            />
          ) : (
            <Stat label="Next briefing" value="Off" sub={<Link href="/settings#briefing">Turn on</Link>} loading={loading} />
          )}
        </Card>
      </div>

      <Card title="Recent moves" titleId="recent-moves" flush>
        <IndexTable
          columns={[{ label: "Move" }, { label: "Competitor", width: 180 }, { label: "Priority", width: 110 }, { label: "When", width: 110 }]}
          rows={rows}
          loading={loading}
          loadingLabel="Loading moves…"
          filters={
            moves.length > 0 || error ? (
              <>
                <FilterSelect
                  label="Competitor"
                  value={filters.competitor}
                  onChange={setFilter("competitor")}
                  options={[{ value: "all", label: "All" }, ...competitors.map((c) => ({ value: c.id, label: c.name }))]}
                />
                <FilterSelect label="Type" value={filters.type} onChange={setFilter("type")} options={TYPE_OPTIONS} />
                <FilterSelect label="Priority" value={filters.priority} onChange={setFilter("priority")} options={PRIORITY_OPTIONS} />
              </>
            ) : undefined
          }
          error={
            error ? (
              <Banner
                tone="critical"
                title="We couldn't load your moves"
                actions={<Button onClick={() => window.location.reload()}>Try again</Button>}
              >
                Check your connection and try again. Your competitors are still being checked.
              </Banner>
            ) : undefined
          }
          empty={
            moves.length === 0 ? (
              <EmptyState art="radar" title="No moves yet" actions={<Button href={firstReport}>View snapshots</Button>}>
                We check your competitors every 2 hours. First changes usually show up within a day or two.
              </EmptyState>
            ) : (
              <EmptyState
                art="filter"
                title="No moves match these filters"
                actions={<Button onClick={() => setFilters(NO_FILTERS)}>Clear filters</Button>}
              >
                Try a different competitor or priority, or clear the filters to see everything.
              </EmptyState>
            )
          }
          pagination={{
            from: page * PAGE_SIZE + 1,
            to: page * PAGE_SIZE + pageMoves.length,
            total: filtered.length,
            onPrevious: page > 0 ? () => setPage((p) => p - 1) : undefined,
            onNext: (page + 1) * PAGE_SIZE < filtered.length ? () => setPage((p) => p + 1) : undefined,
          }}
        />
      </Card>

      <AddCompetitorModal
        open={modal}
        onClose={() => setModal(false)}
        remaining={BETA_LIMIT - competitors.length}
      />
    </PageBody>
  );
}
