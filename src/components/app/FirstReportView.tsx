"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Avatar, Thumbnail } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner, Stat } from "@/components/ui/Feedback";
import { IconExternal } from "@/components/ui/icons";
import { PageBody, PageHeader } from "@/components/ui/Page";
import { cameStraightFrom, originOf } from "@/features/appData/backTrail";
import { count, money, shortDate } from "@/features/appData/format";
import type { FirstReport, ReportItem, ReportList, WatchedPage } from "@/features/appData/types";
import { CategoriesCard } from "./CategoriesCard";
import styles from "./FirstReportView.module.css";

const PREVIEW = 4;
/** "See all" expands in place up to this many (DESIGN_TO_COMPONENTS D3). */
const EXPANDED_MAX = 50;

function ListCard({
  title,
  list,
  reading,
  emptyText,
  storeUrl,
  render,
}: {
  title: string;
  list: ReportList;
  reading?: boolean;
  emptyText: string;
  storeUrl: string;
  render: (item: ReportItem) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? list.items.slice(0, EXPANDED_MAX) : list.items.slice(0, PREVIEW);
  const id = title.toLowerCase().replace(/\s+/g, "-");
  return (
    <Card title={title} titleId={id}>
      {reading ? (
        <Spinner label={`Reading ${title.toLowerCase()}…`} />
      ) : list.items.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <>
          <ul className={styles.list}>
            {shown.map((item) => (
              <li key={item.id} className={styles.row}>
                {render(item)}
                <ProductLink url={item.url} title={item.title} />
              </li>
            ))}
          </ul>
          <div className={styles.more}>
            {!expanded && list.total > PREVIEW ? (
              <Button variant="plain" onClick={() => setExpanded(true)}>
                {`See all ${list.total}`}
              </Button>
            ) : expanded && list.total > EXPANDED_MAX ? (
              <Button variant="plain" href={storeUrl} external icon={<IconExternal />}>
                See the rest on their store
              </Button>
            ) : null}
          </div>
        </>
      )}
    </Card>
  );
}

/** Opens the product on their store in a new tab. */
function ProductLink({ url, title }: { url: string; title: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${title} on their store`} className={styles.pageLink}>
      <IconExternal />
    </a>
  );
}

function WatchedPages({ pages }: { pages: WatchedPage[] }) {
  return (
    <ul className={styles.list}>
      {pages.map((p) => (
        <li key={p.url} className={styles.row}>
          <ItemText title={p.label} />
          <span className={styles.itemSub}>{p.changedAt ? `changed ${shortDate(p.changedAt)}` : "no changes yet"}</span>
          <a href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${p.label}`} className={styles.pageLink}>
            <IconExternal />
          </a>
        </li>
      ))}
    </ul>
  );
}

function ItemText({ title, sub, href }: { title: string; sub?: string; href?: string }) {
  return (
    <div className={styles.itemText}>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={`${styles.itemTitle} ${styles.itemLink}`}>
          {title}
        </a>
      ) : (
        <span className={styles.itemTitle}>{title}</span>
      )}
      {sub ? <span className={styles.itemSub}>{sub}</span> : null}
    </div>
  );
}

export function FirstReportView({ report, reading, error }: { report: FirstReport | null; reading?: boolean; error?: boolean }) {
  const router = useRouter();
  // Back to the competitor's page: a step back in history when that page is
  // what's behind this one (it keeps its place and its own "‹ Home" link),
  // otherwise a plain link that carries the origin along.
  const origin = originOf(useSearchParams().get("from"));
  const backTo = (id: string, name: string) => ({
    href: `/competitors/${id}${origin ? `?from=${origin}` : ""}`,
    label: name,
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || !cameStraightFrom(`/competitors/${id}`)) return;
      e.preventDefault();
      router.back();
    },
  });

  if (!report) {
    return (
      <PageBody>
        <Card>
          <EmptyState art="search" title="We can't find that competitor" actions={<Button variant="primary" href="/competitors">Go to Competitors</Button>}>
            It may have been removed, or the link is out of date.
          </EmptyState>
        </Card>
      </PageBody>
    );
  }

  const { competitor: c, stats } = report;
  const storeUrl = `https://${c.domain}`;
  const pagesOnly = c.platform === "other";

  const header = (
    <PageHeader
      title={`${c.name} right now`}
      breadcrumb={backTo(c.id, c.name)}
      leading={<Avatar name={c.name} size={32} domain={c.domain} />}
      actions={
        <>
          <Button variant="grey" href={storeUrl} external icon={<IconExternal />}>
            Visit store
          </Button>
          <Button variant="primary" href="/dashboard">
            Go to Home
          </Button>
        </>
      }
    />
  );
  const footer = (
    <p className={styles.footnote}>
      From now on we check {c.name} every {report.checkIntervalHours} hours and tell you what changes.
    </p>
  );

  if (error) {
    return (
      <PageBody>
        {header}
        <Banner tone="critical" title="We couldn't build this report" actions={<Button onClick={() => window.location.reload()}>Try again</Button>}>
          Something went wrong while reading {c.domain}. Your competitor is saved; try again in a moment.
        </Banner>
      </PageBody>
    );
  }

  if (pagesOnly) {
    return (
      <PageBody>
        {header}
        <Banner tone="info" title={`${c.name} isn't on Shopify`}>
          We can&rsquo;t read its catalog, so there are no product stats. We watch these pages instead and tell you when they change:{" "}
          {report.pages.map((p) => p.label).join(", ")}.
        </Banner>
        <Card title="Watched pages" titleId="watched-pages">
          <WatchedPages pages={report.pages} />
        </Card>
        {footer}
      </PageBody>
    );
  }

  return (
    <PageBody>
      {header}
      {stats.productsCapped ? (
        <Banner tone="info">We&rsquo;ve read the first 25,000 products. Stats and lists below cover those.</Banner>
      ) : null}

      <Card>
        <div className={styles.stats}>
          <Stat label="Products" value={stats.productsCapped ? `${count(stats.products)}+` : count(stats.products)} loading={reading} />
          <Stat label="On sale" value={count(stats.onSale)} loading={reading} />
          <Stat label="Sold out" value={count(stats.soldOut)} loading={reading} />
          <Stat label="Average price" value={money(stats.avgPrice)} loading={reading} />
        </div>
      </Card>

      <div className={styles.columns}>
        <div className={styles.column}>
          <ListCard
            title="Recently launched"
            list={report.recentlyLaunched}
            reading={reading}
            storeUrl={storeUrl}
            emptyText="Nothing launched in the last 30 days."
            render={(i) => (
              <>
                <Thumbnail src={i.image} />
                <ItemText title={i.title} href={i.url} sub={i.date ? shortDate(i.date) : undefined} />
                <span className={styles.price}>{money(i.price)}</span>
              </>
            )}
          />
          <ListCard
            title="Sold out"
            list={report.soldOut}
            reading={reading}
            storeUrl={storeUrl}
            emptyText="Nothing sold out."
            render={(i) => (
              <>
                <Thumbnail src={i.image} />
                {/* "since …" only once history tells us when (D4). */}
                <ItemText title={i.title} href={i.url} sub={i.date ? `since ${shortDate(i.date)}` : undefined} />
                <Badge>Sold out</Badge>
              </>
            )}
          />
        </div>
        <div className={styles.column}>
          <ListCard
            title="On sale now"
            list={report.onSale}
            reading={reading}
            storeUrl={storeUrl}
            emptyText="Nothing on sale right now."
            render={(i) => (
              <>
                <Thumbnail src={i.image} />
                <ItemText title={i.title} href={i.url} />
                <div className={styles.priceStack}>
                  <span className={styles.priceLine}>
                    <Badge tone="attention">{`−${i.pctOff}%`}</Badge>
                    <span className={styles.price}>{money(i.price)}</span>
                  </span>
                  <span className={styles.was}>{money(i.compareAtPrice)}</span>
                </div>
              </>
            )}
          />
          {report.cheaperThanYours ? (
            <Card title="Cheaper than yours" titleId="cheaper-than-yours">
              {reading ? (
                <Spinner label="Reading cheaper than yours…" />
              ) : report.cheaperThanYours.length === 0 ? (
                <p className={styles.empty}>
                  {report.comparisonPending
                    ? "We’re still comparing their products with yours. This can take a few days."
                    : "Nothing of theirs is priced below a similar product of yours."}
                </p>
              ) : (
                <ul className={styles.list}>
                  {report.cheaperThanYours.map((u) => (
                    <li key={u.title} className={styles.row}>
                      <ItemText title={u.title} sub={`Yours: ${u.yourTitle}`} />
                      <div className={styles.priceStack}>
                        <span className={styles.price}>
                          {money(u.price, { whole: true })} <span className={styles.vs}>vs yours {money(u.yourPrice, { whole: true })}</span>
                        </span>
                        <span className={styles.cheaper}>{money(u.yourPrice - u.price, { whole: true })} cheaper</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}
        </div>
      </div>

      <div className={styles.columns}>
        <div className={styles.column}>
          {report.categories !== undefined ? <CategoriesCard categories={reading ? null : report.categories} storeName={c.name} /> : null}
        </div>
        <div className={styles.column}>
          <Card title="Watched pages" titleId="watched-pages">
            <WatchedPages pages={report.pages} />
          </Card>
        </div>
      </div>
      {footer}
    </PageBody>
  );
}
