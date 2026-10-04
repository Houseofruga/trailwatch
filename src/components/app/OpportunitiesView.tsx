"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tooltip } from "@/components/ui/Overlay";
import { PageBody, PageHeader } from "@/components/ui/Page";
import { useToast } from "@/components/ui/Toast";
import {
  IconBan,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconHome,
  IconImage,
  IconInfo,
  IconLock,
  IconPackage,
  IconStore,
  IconTrendUp,
} from "@/components/ui/icons";
import { dismissOpportunity, markOpportunityNotRelevant, restoreOpportunity } from "@/features/appData/actions";
import { money } from "@/features/appData/format";
import type { OpportunitiesPage } from "@/features/appData/types";
import type { EvidenceProduct } from "@/features/opportunities/build";
import type { OpportunityView } from "@/features/opportunities/queries";
import styles from "./OpportunitiesView.module.css";

// The Opportunities screen (DESIGN 11-opps): gaps and competitor momentum,
// each with what we noticed, the evidence and one suggested action.

export const KIND_LABEL: Record<OpportunityView["kind"], string> = {
  category_gap: "Category gap",
  format_gap: "Format gap",
  price_tier_gap: "Entry price",
  rising_product: "Rising product",
  demand: "Demand",
};

type Tab = "all" | "gaps" | "rising" | "demand";
const TABS: { id: Tab; label: string; match: (o: OpportunityView) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "gaps", label: "Gaps", match: (o) => o.kind.endsWith("_gap") },
  { id: "rising", label: "Rising products", match: (o) => o.kind === "rising_product" },
  { id: "demand", label: "Demand", match: (o) => o.kind === "demand" },
];

// Chips name signals, never sales ("#4 in Best Sellers", not "sells 400").
const RECENT_LAUNCH_DAYS = 30;
function chips(e: EvidenceProduct): { icon: React.ReactNode; text: string }[] {
  const out: { icon: React.ReactNode; text: string }[] = [];
  if (e.bestsellerPosition) out.push({ icon: <IconTrendUp size={12} />, text: `#${e.bestsellerPosition} in Best Sellers` });
  else if (e.inBestsellers) out.push({ icon: <IconTrendUp size={12} />, text: "In Best Sellers" });
  if (e.launchedDaysAgo !== null && e.launchedDaysAgo <= RECENT_LAUNCH_DAYS) {
    out.push({ icon: <IconPackage size={12} />, text: `Launched ${e.launchedDaysAgo === 1 ? "1 day" : `${e.launchedDaysAgo} days`} ago` });
  }
  if (e.restocks90 >= 2) out.push({ icon: <IconClock size={12} />, text: `Restocked ${e.restocks90}× in 90 days` });
  if (e.soldOutAfterDays !== null) {
    out.push({ icon: <IconBan size={12} />, text: e.soldOutAfterDays === 0 ? "Sold out on launch day" : `Sold out ${e.soldOutAfterDays} days after launch` });
  }
  if (e.featuredDays !== null) out.push({ icon: <IconHome size={12} />, text: `On homepage ${e.featuredDays} days` });
  return out;
}

function Thumb({ src }: { src: string | null | undefined }) {
  return (
    <span className={styles.thumb} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" loading="lazy" /> : <IconImage size={19} />}
    </span>
  );
}

function Evidence({ o, stores, id }: { o: OpportunityView; stores: OpportunitiesPage["stores"]; id: string }) {
  const unavailable = o.evidence.competitors.filter((c) => stores[c.storeId]?.bestsellersUnavailable);
  return (
    <div id={id} className={styles.evidence}>
      <h3 className={styles.evidenceTitle}>Evidence</h3>
      <ul className={styles.products}>
        {o.evidence.competitors.flatMap((c) =>
          c.products.map((e) => (
            <li key={`${c.storeId}:${e.handle}`} className={styles.product}>
              <Thumb src={e.image} />
              <div className={styles.productText}>
                <span className={styles.productTitle}>{e.title}</span>
                <span className={styles.productMeta}>
                  {c.storeName}
                  {e.price !== null ? ` · ${money(e.price)}` : ""}
                </span>
                {chips(e).length ? (
                  <div className={styles.chips}>
                    {chips(e).map((chip) => (
                      <span key={chip.text} className={styles.chip}>
                        {chip.icon}
                        {chip.text}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </li>
          )),
        )}
      </ul>
      {unavailable.map((c) => (
        <p key={c.storeId} className={styles.note}>
          <IconInfo size={14} />
          {c.storeName} doesn&rsquo;t publish a Best Sellers list we can read.
        </p>
      ))}
    </div>
  );
}

function OpportunityCard({
  o,
  stores,
  expanded,
  leaving,
  onToggle,
  onDismiss,
  onNotRelevant,
}: {
  o: OpportunityView;
  stores: OpportunitiesPage["stores"];
  expanded: boolean;
  leaving: boolean;
  onToggle: () => void;
  onDismiss: () => void;
  onNotRelevant: () => void;
}) {
  const competitors = o.evidence.competitors;
  const evidenceId = `evidence-${o.id}`;
  return (
    <article className={`${styles.card} ${leaving ? styles.leaving : ""}`} aria-hidden={leaving || undefined}>
      <div className={styles.cardHead}>
        <Badge>{KIND_LABEL[o.kind]}</Badge>
        {competitors.length ? (
          <span className={styles.who}>
            <span className={styles.avatars}>
              {competitors.map((c) => (
                <span key={c.storeId} className={styles.avatarRing}>
                  <Avatar name={c.storeName} size={20} domain={stores[c.storeId]?.domain} />
                </span>
              ))}
            </span>
            <span className={styles.names}>{competitors.map((c) => c.storeName).join(", ")}</span>
          </span>
        ) : null}
      </div>
      <h2 className={styles.noticed}>{o.noticed}</h2>
      {expanded ? <Evidence o={o} stores={stores} id={evidenceId} /> : null}
      <p className={styles.try}>
        <strong>Try:</strong> {o.action}
      </p>
      <div className={styles.cardFoot}>
        <button type="button" className={styles.toggle} aria-expanded={expanded} aria-controls={evidenceId} onClick={onToggle}>
          {expanded ? "Hide evidence" : "Show evidence"}
          {expanded ? <IconChevronUp /> : <IconChevronDown />}
        </button>
        <div className={styles.footActions}>
          <button type="button" className={styles.linkButton} onClick={onNotRelevant}>
            Not relevant to me
          </button>
          <Tooltip text="Comes back only if the evidence gets much stronger" align="end">
            <Button onClick={onDismiss}>Dismiss</Button>
          </Tooltip>
        </div>
      </div>
    </article>
  );
}

function Skeleton() {
  return (
    <div className={styles.list} aria-busy="true">
      <span className={styles.srOnly}>Loading opportunities</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className={`${styles.card} ${styles.skeleton}`}>
          <div className={styles.cardHead}>
            <span className={styles.bar} style={{ width: 90, height: 20 }} />
            <span className={styles.bar} style={{ width: 140, height: 14 }} />
          </div>
          <span className={styles.bar} style={{ width: "92%" }} />
          <span className={styles.bar} style={{ width: "60%" }} />
          <span className={styles.block} />
        </div>
      ))}
    </div>
  );
}

export function OpportunitiesView({
  page,
  loading,
  initialExpanded,
  demo,
}: {
  page: OpportunitiesPage;
  loading?: boolean;
  /** Preview state 11b: this card starts expanded. */
  initialExpanded?: string;
  /** Preview states: buttons change the screen only, nothing is saved. */
  demo?: boolean;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("all");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(initialExpanded ? [initialExpanded] : []));
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const [dismissedExtra, setDismissedExtra] = useState(0);
  const [, startTransition] = useTransition();

  const visible = page.items.filter((o) => !hidden.has(o.id));
  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.id, visible.filter(t.match).length])), [visible]);
  const shown = visible.filter(TABS.find((t) => t.id === tab)!.match);

  const setIn = (set: React.Dispatch<React.SetStateAction<Set<string>>>, id: string, on: boolean) =>
    set((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const bringBack = (id: string) => {
    setIn(setHidden, id, false);
    setDismissedExtra((n) => n - 1);
    if (!demo) startTransition(() => void restoreOpportunity(id));
  };

  const remove = (o: OpportunityView, how: "dismiss" | "not_relevant") => {
    // The card slides out, then the list closes up (11c).
    setIn(setLeaving, o.id, true);
    setTimeout(() => {
      setIn(setLeaving, o.id, false);
      setIn(setHidden, o.id, true);
      setDismissedExtra((n) => n + 1);
    }, 220);
    if (!demo) {
      startTransition(async () => {
        const res = await (how === "dismiss" ? dismissOpportunity(o.id) : markOpportunityNotRelevant(o.id));
        if (!res.ok) {
          setIn(setHidden, o.id, false);
          setDismissedExtra((n) => n - 1);
          toast("Couldn't save that. Try again.", { error: true });
        }
      });
    }
    toast(
      how === "dismiss" ? "Dismissed. We’ll bring it back if the evidence gets much stronger." : "Got it. We won’t show this again.",
      { action: { label: "Undo", onClick: () => bringBack(o.id) } },
    );
  };

  const header = <PageHeader title="Opportunities" subtitle="Gaps and momentum across your competitors, updated daily." />;

  if (!page.available) {
    return (
      <PageBody medium>
        {header}
        <Card>
          <div className={styles.plan}>
            <span className={styles.planIcon}>
              <IconLock size={22} />
            </span>
            <h2 className={styles.planTitle}>Opportunities are part of Pro.</h2>
            <p className={styles.planText}>See gaps in your range and competitor products gaining momentum, with one suggested action for each.</p>
            <Link href="/billing" className={styles.planLink}>
              See Pro plans
            </Link>
          </div>
        </Card>
      </PageBody>
    );
  }

  const learning = !loading && page.items.length === 0;
  const dismissedCount = page.dismissedCount + dismissedExtra;

  return (
    <PageBody medium>
      {header}

      {!learning || !page.hasOwnStore ? (
        <div role="tablist" aria-label="Filter opportunities" className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabOn : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {/* Counts only with your store (11a); 11e and loading show bare tabs. */}
              {!loading && page.hasOwnStore && page.items.length ? <span className={styles.tabCount}>{counts[t.id]}</span> : null}
            </button>
          ))}
        </div>
      ) : null}

      {!page.hasOwnStore && !loading ? (
        <Card>
          <div className={styles.ask}>
            <span className={styles.askIcon}>
              <IconStore size={20} />
            </span>
            <div className={styles.askBody}>
              <p className={styles.askText}>Add your store to see gaps in your range. Rising products and demand signals still show up here.</p>
              <div>
                <Button variant="primary" href="/settings#your-store">
                  Add your store
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {loading ? (
        <Skeleton />
      ) : learning ? (
        <Card>
          <EmptyState art="radar" title="We’re still learning these stores">
            Best Sellers movement needs a few daily reads, and restock patterns need a few weeks. Check back soon.
          </EmptyState>
        </Card>
      ) : (
        <div className={styles.list}>
          {shown.map((o) => (
            <OpportunityCard
              key={o.id}
              o={o}
              stores={page.stores}
              expanded={expanded.has(o.id)}
              leaving={leaving.has(o.id)}
              onToggle={() => setIn(setExpanded, o.id, !expanded.has(o.id))}
              onDismiss={() => remove(o, "dismiss")}
              onNotRelevant={() => remove(o, "not_relevant")}
            />
          ))}
        </div>
      )}

      {!loading && dismissedCount > 0 ? (
        <div className={styles.dismissedLink}>
          <Link href="/opportunities/dismissed">Show dismissed ({dismissedCount})</Link>
        </div>
      ) : null}
    </PageBody>
  );
}
