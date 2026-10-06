"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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
import { rememberHomeUrl } from "@/features/appData/backTrail";
import { briefingTime, money, when } from "@/features/appData/format";
import type { BriefingPanel, CompetitorRow, HomeSummary, Move } from "@/features/appData/types";
import { AddCompetitorModal } from "./AddCompetitorModal";
import { BriefingCard } from "./BriefingCard";
import { MoveIcon, PRIORITY_OPTIONS, PriorityBadge, TYPE_OPTIONS } from "./moveParts";
import styles from "./HomeView.module.css";

const PAGE_SIZE = 10;
const BETA_LIMIT = 10;

const GUIDE_DISMISSED = "tw_setup_guide_dismissed";
const GUIDE_EVENT = "tw-setup-guide";

function subscribeGuide(onChange: () => void) {
  window.addEventListener(GUIDE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(GUIDE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

let guideDismissedThisVisit = false;

function guideIsDismissed(): boolean {
  if (guideDismissedThisVisit) return true;
  try {
    return localStorage.getItem(GUIDE_DISMISSED) === "1";
  } catch {
    return false;
  }
}

function dismissGuide() {
  guideDismissedThisVisit = true;
  try {
    localStorage.setItem(GUIDE_DISMISSED, "1");
  } catch {
    // Storage blocked: it's dismissed for this visit only.
  }
  window.dispatchEvent(new Event(GUIDE_EVENT));
}

type Filters = { competitor: string; type: string; priority: string };
const NO_FILTERS: Filters = { competitor: "all", type: "all", priority: "all" };

/** A filter value from the address, if it's one we offer; else "all". */
const pick = (raw: string | null, allowed: string[]) => (raw && allowed.includes(raw) ? raw : "all");

export function HomeView({
  state,
  summary,
  moves,
  competitors,
  briefing,
}: {
  state: HomeState;
  summary: HomeSummary;
  moves: Move[];
  competitors: CompetitorRow[];
  briefing: BriefingPanel;
}) {
  const [modal, setModal] = useState(state.startsWith("add-competitor-modal"));
  // Dismissing the setup guide sticks (in this browser). Until the browser has
  // answered, it stays hidden, so a dismissed guide never flashes on load.
  const guideDismissed = useSyncExternalStore(subscribeGuide, guideIsDismissed, () => true);
  // Filters and page come from the address (?competitor=…&type=…&priority=…&page=2)
  // and are written back to it, so opening a move and coming back, reloading or
  // sharing the link all return to the same list.
  const params = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() =>
    state === "filters-match-nothing"
      ? { competitor: "dewlane", type: "launch", priority: "high" }
      : {
          competitor: pick(params.get("competitor"), competitors.map((c) => c.id)),
          type: pick(params.get("type"), TYPE_OPTIONS.map((o) => o.value)),
          priority: pick(params.get("priority"), PRIORITY_OPTIONS.map((o) => o.value)),
        },
  );
  const [page, setPage] = useState(() => Math.max(0, (Number.parseInt(params.get("page") ?? "1", 10) || 1) - 1));
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
  // A page number past the end (a stale link, moves that aged out) shows the last page.
  const lastPage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
  const shownPage = Math.min(page, lastPage);
  const pageMoves = filtered.slice(shownPage * PAGE_SIZE, (shownPage + 1) * PAGE_SIZE);

  useEffect(() => {
    const url = new URL(window.location.href);
    for (const key of ["competitor", "type", "priority"] as const) {
      if (filters[key] === "all") url.searchParams.delete(key);
      else url.searchParams.set(key, filters[key]);
    }
    if (shownPage === 0) url.searchParams.delete("page");
    else url.searchParams.set("page", String(shownPage + 1));
    if (url.href !== window.location.href) window.history.replaceState(null, "", url);
    rememberHomeUrl(`${url.pathname}${url.search}`);
  }, [filters, shownPage]);
  const setFilter = (k: keyof Filters) => (v: string) => {
    setFilters((f) => ({ ...f, [k]: v }));
    setPage(0);
  };

  const rows: Row[] = pageMoves.map((m) => {
    // `from=home`: the competitor page's back link then returns here.
    const href = `/competitors/${m.competitorId}?from=home#move-${m.id}`;
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
          <Avatar name={m.competitorName} domain={m.competitorDomain} />
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

  // With one competitor the empty state opens its snapshot; with several it
  // opens the list, since there's a snapshot for each.
  const emptyAction =
    competitors.length === 1 ? (
      <Button href={`/competitors/${competitors[0].id}/report`}>View snapshot</Button>
    ) : (
      <Button href="/competitors">View competitors</Button>
    );
  const checkEvery = competitors[0]?.checkIntervalHours ?? 2;

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
          onDismiss={dismissGuide}
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

      <BriefingCard panel={briefing} next={summary.nextBriefing} loading={loading} />

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
              <EmptyState art="radar" title="No moves yet" actions={emptyAction}>
                We check your competitors every {checkEvery} hours. First changes usually show up within a day or two.
              </EmptyState>
            ) : (
              <EmptyState
                art="filter"
                title="No moves match these filters"
                actions={<Button onClick={() => (setFilters(NO_FILTERS), setPage(0))}>Clear filters</Button>}
              >
                Try a different competitor or priority, or clear the filters to see everything.
              </EmptyState>
            )
          }
          pagination={{
            from: shownPage * PAGE_SIZE + 1,
            to: shownPage * PAGE_SIZE + pageMoves.length,
            total: filtered.length,
            onPrevious: shownPage > 0 ? () => setPage(shownPage - 1) : undefined,
            onNext: shownPage < lastPage ? () => setPage(shownPage + 1) : undefined,
          }}
        />
      </Card>

      <AddCompetitorModal
        open={modal}
        onClose={() => setModal(false)}
        remaining={BETA_LIMIT - competitors.length}
        preview={
          state === "add-competitor-modal" ? "ready" : state === "add-competitor-modal-no-store" ? "no-store" : undefined
        }
      />
    </PageBody>
  );
}
