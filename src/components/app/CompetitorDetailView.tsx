"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner, Stat } from "@/components/ui/Feedback";
import { IconChevronDown, IconDots, IconExternal, IconTrendDown, IconX } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { PopoverMenu } from "@/components/ui/Overlay";
import { PageBody, PageHeader } from "@/components/ui/Page";
import { FilterSelect } from "@/components/ui/Select";
import { TimelineDay, TimelineItem, TimelineNote } from "@/components/ui/Timeline";
import { useToast } from "@/components/ui/Toast";
import { removeCompetitor } from "@/features/appData/actions";
import { cameStraightFrom, ORIGINS, originOf } from "@/features/appData/backTrail";
import { ago, clockTime, count, dayHeading, dayKey, money, shortDate, when } from "@/features/appData/format";
import type { CompetitorOverview, Move } from "@/features/appData/types";
import { CategoriesCard } from "./CategoriesCard";
import { MoveIcon, PRIORITY_OPTIONS, PriorityBadge, TYPE_OPTIONS } from "./moveParts";
import styles from "./CompetitorDetailView.module.css";

const COMPARING = "We’re still comparing their products with yours. This can take a few days.";

const DAYS_PER_PAGE = 25;

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function CompetitorDetailView({
  competitor,
  moves,
  noMovesYet,
  loading,
  error,
  openRemove,
  highlight,
}: {
  competitor: CompetitorOverview | null;
  moves: Move[];
  noMovesYet?: boolean;
  loading?: boolean;
  error?: boolean;
  openRemove?: boolean;
  highlight?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [remove, setRemove] = useState(!!openRemove);
  const [removing, setRemoving] = useState(false);
  const [type, setType] = useState("all");
  const [priority, setPriority] = useState("all");
  const [days, setDays] = useState(DAYS_PER_PAGE);
  // Arriving from Home, an alert or a briefing link (#move-<id>): highlight
  // that move. Only alert-email links (?from=alert) get the eyebrow.
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  const from = useSearchParams().get("from");
  const fromAlert = from === "alert";
  // The back link names where the visitor came from (Home's move lists), and
  // returns them to the same spot there; otherwise it's the Competitors list.
  const origin = originOf(from);
  const back = origin
    ? {
        ...ORIGINS[origin],
        onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || !cameStraightFrom(ORIGINS[origin].href)) return;
          e.preventDefault();
          router.back();
        },
      }
    : { href: "/competitors", label: "Competitors" };
  const focused = highlight ?? /^#move-(.+)$/.exec(hash)?.[1];
  const fromEmail = highlight ?? (fromAlert ? focused : undefined);
  useEffect(() => {
    if (focused) document.getElementById(`move-${focused}`)?.scrollIntoView({ block: "center" });
  }, [focused]);

  const filtered = useMemo(
    () => moves.filter((m) => (type === "all" || m.kind === type) && (priority === "all" || m.priority === priority)),
    [moves, type, priority],
  );
  const groups = useMemo(() => {
    const byDay = new Map<string, Move[]>();
    for (const m of filtered) {
      const k = dayKey(new Date(m.at));
      byDay.set(k, [...(byDay.get(k) ?? []), m]);
    }
    return [...byDay.values()];
  }, [filtered]);

  if (!competitor) {
    return (
      <PageBody>
        <PageHeader title="" breadcrumb={back} />
        <Card>
          <EmptyState art="search" title="We can't find that competitor" actions={<Button variant="primary" href="/competitors">Go to Competitors</Button>}>
            It may have been removed, or the link is out of date.
          </EmptyState>
        </Card>
      </PageBody>
    );
  }

  const c = competitor;
  const pagesOnly = c.status === "pages_only";
  const cantReach = c.status === "cant_reach";

  async function confirmRemove() {
    setRemoving(true);
    const res = await removeCompetitor(c.id);
    if (!res.ok) {
      setRemoving(false);
      return toast(`Couldn't remove ${c.name}. Try again.`, { error: true });
    }
    toast(`${c.name} removed`);
    router.push("/competitors");
  }

  const moreActions = (
    <PopoverMenu
      items={[{ label: "Remove competitor", icon: <IconX />, critical: true, onSelect: () => setRemove(true) }]}
      trigger={(p) => (
        <>
          <button type="button" className={styles.moreDesktop} {...p}>
            More actions <IconChevronDown size={14} />
          </button>
          <Button variant="grey" iconOnly aria-label="More actions" className={styles.moreMobile} icon={<IconDots />} {...p} />
        </>
      )}
    />
  );

  const timelineEmpty = noMovesYet ? (
    <EmptyState art="radar" title="No moves yet" actions={<Button href={`/competitors/${c.id}/report`}>View snapshot</Button>}>
      We read {c.name}&rsquo;s catalog {ago(c.lastCheckedAt)}. We&rsquo;ll list changes here as soon as we see them; first changes
      usually show up within a day or two.
    </EmptyState>
  ) : moves.length === 0 ? (
    <EmptyState art="radar" title="No moves in the last 30 days">
      We&rsquo;re still checking every {c.checkIntervalHours} hours. Quiet can be good news: nothing for you to react to.
    </EmptyState>
  ) : (
    <EmptyState art="filter" title="No moves match these filters" actions={<Button onClick={() => (setType("all"), setPriority("all"))}>Clear filters</Button>}>
      Clear the filters to see everything.
    </EmptyState>
  );

  return (
    <PageBody>
      <PageHeader
        title={c.name}
        breadcrumb={back}
        leading={<Avatar name={c.name} size={32} domain={c.domain} />}
        badges={
          pagesOnly ? (
            <Badge>Pages only</Badge>
          ) : cantReach ? (
            <Badge tone="attention">Can&rsquo;t reach</Badge>
          ) : c.movesThisWeek > 0 ? (
            <Badge tone="attention">{`${c.movesThisWeek} moves this week`}</Badge>
          ) : null
        }
        subtitle={c.domain}
        actions={
          <>
            {moreActions}
            <Button variant="grey" href={`/competitors/${c.id}/report`}>
              View snapshot
            </Button>
            <Button variant="grey" href={`https://${c.domain}`} external icon={<IconExternal />}>
              Visit store
            </Button>
          </>
        }
      />

      {error ? (
        <Banner tone="critical" title={`We couldn't load ${c.name}`} actions={<Button onClick={() => window.location.reload()}>Try again</Button>}>
          Check your connection and try again.
        </Banner>
      ) : pagesOnly ? (
        <Banner tone="info">
          {c.name} isn&rsquo;t on Shopify, so we watch its pages, not its catalog. You&rsquo;ll see page changes here, but no prices or products.
        </Banner>
      ) : cantReach && c.unreachableSince ? (
        <Banner
          tone="warning"
          title={`We can't reach ${c.domain}`}
          actions={
            <>
              <Button href={`https://${c.domain}`} external>
                Visit store
              </Button>
              <Button variant="plainDark" onClick={() => setRemove(true)}>
                Remove competitor
              </Button>
            </>
          }
        >
          We&rsquo;ve been trying since {shortDate(c.unreachableSince)} and will keep checking every {c.checkIntervalHours} hours. If they
          moved to a new website, remove them and add the new address.
        </Banner>
      ) : null}

      <div className={styles.columns}>
        <div className={styles.main}>
          <Card title="Timeline" titleId="timeline" flush>
            {loading ? (
              <Spinner label="Loading timeline…" />
            ) : error ? null : moves.length === 0 ? (
              timelineEmpty
            ) : (
              <>
                <div className={styles.filters}>
                  <FilterSelect label="Type" value={type} onChange={setType} options={TYPE_OPTIONS} />
                  <FilterSelect label="Priority" value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
                </div>
                {groups.length === 0
                  ? timelineEmpty
                  : groups.slice(0, days).map((group) => (
                      <TimelineDay key={group[0].at} heading={dayHeading(group[0].at)}>
                        {group.map((m) => (
                          <TimelineItem
                            key={m.id}
                            id={`move-${m.id}`}
                            icon={<MoveIcon kind={m.kind} />}
                            title={m.summary}
                            highlighted={focused === m.id}
                            eyebrow={fromEmail === m.id ? "From your alert email" : undefined}
                            meta={
                              <>
                                <PriorityBadge priority={m.priority} />
                                <span>{dayHeading(m.at).startsWith("Today") ? when(m.at) : clockTime(m.at)}</span>
                              </>
                            }
                          >
                            {m.meaning ? <TimelineNote label="What it means">{m.meaning}</TimelineNote> : null}
                            {m.comparedWithYours ? (
                              <TimelineNote label="Compared with yours" icon={<IconTrendDown size={14} />}>
                                {m.comparedWithYours}
                              </TimelineNote>
                            ) : null}
                          </TimelineItem>
                        ))}
                      </TimelineDay>
                    ))}
                {groups.length > days ? (
                  <div className={styles.more}>
                    <Button variant="plain" onClick={() => setDays((d) => d + DAYS_PER_PAGE)}>
                      Show older
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </Card>
        </div>

        {!error ? (
          <aside className={styles.side}>
            {!pagesOnly ? (
              <Card title="Catalog" titleId="catalog">
                {loading ? (
                  <Spinner label="Reading catalog…" />
                ) : (
                  <div className={styles.catalog}>
                    <div className={styles.statGrid}>
                      <Stat size="md" label="Products" value={count(c.catalog.products)} />
                      <Stat size="md" label="On sale" value={count(c.catalog.onSale)} />
                      <Stat size="md" label="Sold out" value={count(c.catalog.soldOut)} />
                      <Stat size="md" label="Average price" value={money(c.catalog.avgPrice)} />
                    </div>
                    <p className={styles.checked}>
                      {cantReach && c.unreachableSince
                        ? `Last read ${shortDate(c.unreachableSince)} · retrying every ${c.checkIntervalHours} hours`
                        : `Checked ${ago(c.lastCheckedAt)} · every ${c.checkIntervalHours} hours`}
                    </p>
                  </div>
                )}
              </Card>
            ) : null}

            {!pagesOnly && c.categories !== undefined ? (
              <CategoriesCard categories={loading ? null : c.categories} storeName={c.name} />
            ) : null}

            <Card title="Watched pages" titleId="watched-pages">
              {loading ? (
                <Spinner label="Loading pages…" />
              ) : (
                <ul className={styles.pages}>
                  {c.pages.map((p) => (
                    <li key={p.url}>
                      <span className={styles.pageLabel}>{p.label}</span>
                      <span className={styles.pageDate}>{p.changedAt ? `changed ${shortDate(p.changedAt)}` : "no changes yet"}</span>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${p.label}`} className={styles.pageLink}>
                        <IconExternal />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {!loading && !pagesOnly && c.comparison ? (
              <Card title="Compared with your store" titleId="compared">
                {c.comparison.pending ? (
                  <p className={styles.comparePending}>{COMPARING}</p>
                ) : (
                  <>
                    <p className={styles.compare}>
                      {c.comparison.similar} similar products · {c.comparison.cheaper} cheaper than yours
                    </p>
                    <Button variant="plain" className={styles.compareLink} onClick={() => (setType("undercut"), setPriority("all"))}>
                      See the comparison
                    </Button>
                  </>
                )}
              </Card>
            ) : null}
          </aside>
        ) : null}
      </div>

      <Modal
        open={remove}
        title={`Stop watching ${c.name}?`}
        onClose={() => setRemove(false)}
        footer={
          <>
            <Button onClick={() => setRemove(false)}>Cancel</Button>
            <Button variant="critical" loading={removing} onClick={confirmRemove}>
              Remove competitor
            </Button>
          </>
        }
      >
        <p>You&rsquo;ll stop getting alerts about them. If you add them back later, their history comes back too.</p>
      </Modal>
    </PageBody>
  );
}
