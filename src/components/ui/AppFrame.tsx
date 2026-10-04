"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logOut } from "@/features/auth/actions";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { PopoverMenu } from "./Overlay";
import { ToastProvider } from "./Toast";
import { FeedbackModal } from "@/components/app/FeedbackModal";
import { SidebarCallPrompt } from "@/components/app/BetaParts";
import type { BetaStatus } from "@/features/appData/types";
import {
  IconChevronDown,
  IconEye,
  IconHelp,
  IconHome,
  IconLogOut,
  IconMenu,
  IconMessage,
  IconShield,
  IconSliders,
  IconTrendUp,
  IconX,
} from "./icons";
import styles from "./AppFrame.module.css";

export const SUPPORT_EMAIL = "trailwatch@houseofruga.com";

const NAV = [
  { href: "/dashboard", label: "Home", Icon: IconHome },
  { href: "/opportunities", label: "Opportunities", Icon: IconTrendUp },
  { href: "/competitors", label: "Competitors", Icon: IconEye },
  { href: "/settings", label: "Settings", Icon: IconSliders },
];
// Only for ADMIN_EMAILS (the page itself 404s for anyone else).
const ADMIN_NAV = { href: "/admin", label: "Admin space", Icon: IconShield };

type Props = {
  account: { name: string; email: string };
  ownStore: { domain: string; products: number | null } | null;
  competitorCount: number;
  /** Open opportunities (nav badge); 0 hides it. */
  opportunityCount?: number;
  /** Beta-member status: the sidebar call prompt. */
  beta?: BetaStatus | null;
  /** Shows the "Admin space" nav item. */
  isAdmin?: boolean;
  /** Onboarding: nav items shown but not usable. */
  navDisabled?: boolean;
  children: React.ReactNode;
};

function Logo({
  height = 22,
  light = false,
}: {
  height?: number;
  light?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={light ? "/logo-light.svg" : "/logo.svg"}
      alt="Trailwatch"
      height={height}
      width={Math.round(height * 4.52)}
      className={styles.logo}
    />
  );
}

function Sidebar({
  pathname,
  ownStore,
  competitorCount,
  opportunityCount = 0,
  beta,
  isAdmin,
  navDisabled,
  onNavigate,
  onFeedback,
}: Omit<Props, "account" | "children"> & {
  pathname: string;
  onNavigate?: () => void;
  onFeedback?: () => void;
}) {
  const counts: Record<string, number> = {
    Competitors: competitorCount,
    Opportunities: opportunityCount,
  };
  return (
    <nav aria-label="Main" className={styles.nav}>
      <ul className={styles.navList}>
        {(isAdmin ? [...NAV, ADMIN_NAV] : NAV).map(({ href, label, Icon }) => {
          const current =
            !navDisabled &&
            (pathname === href || pathname.startsWith(`${href}/`));
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                aria-disabled={navDisabled || undefined}
                tabIndex={navDisabled ? -1 : undefined}
                className={`${styles.navItem} ${current ? styles.navItemCurrent : ""} ${navDisabled ? styles.navItemDisabled : ""}`}
                onClick={onNavigate}
              >
                <Icon size={18} />
                <span>{label}</span>
                {counts[label] > 0 ? (
                  <span className={styles.count}>{counts[label]}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className={styles.bottom}>
        {/* Beta (DESIGN 12-Beta): call prompt above the store card, feedback link below. */}
        {beta && !navDisabled ? <SidebarCallPrompt beta={beta} /> : null}
        <div className={styles.store}>
          <span className={styles.storeLabel}>Your store</span>
          {ownStore ? (
            <span className={styles.storeName}>
              {ownStore.domain}{" "}
              {ownStore.products !== null ? (
                <span className={styles.storeCount}>
                  · {ownStore.products.toLocaleString("en-US")} products
                </span>
              ) : null}
            </span>
          ) : (
            <Link
              href="/settings#your-store"
              className={styles.storeAdd}
              onClick={onNavigate}
            >
              Add your store
            </Link>
          )}
          <span className={styles.storeBadge}>
            <Badge tone="success">Free beta</Badge>
          </span>
        </div>
        {onFeedback && !navDisabled ? (
          <button
            type="button"
            className={styles.feedbackLink}
            onClick={onFeedback}
          >
            <IconMessage size={16} />
            Send feedback
          </button>
        ) : null}
      </div>
    </nav>
  );
}

/** Top bar + left sidebar (a drawer on phones) around every signed-in screen. */
export function AppFrame({
  account,
  ownStore,
  competitorCount,
  opportunityCount,
  beta,
  isAdmin,
  navDisabled,
  children,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [feedback, setFeedback] = useState(false);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  const menu = (
    <PopoverMenu
      width={220}
      items={[
        {
          label: "Settings",
          icon: <IconSliders />,
          onSelect: () => router.push("/settings"),
        },
        {
          label: "Send feedback",
          icon: <IconMessage />,
          onSelect: () => setFeedback(true),
        },
        {
          label: "Help",
          icon: <IconHelp />,
          onSelect: () => (window.location.href = `mailto:${SUPPORT_EMAIL}`),
        },
        {
          label: "Log out",
          icon: <IconLogOut />,
          onSelect: () => void logOut(),
          separated: true,
        },
      ]}
      trigger={(p) => (
        <button
          type="button"
          className={styles.account}
          aria-label={`Account menu for ${account.name}`}
          {...p}
        >
          <Avatar name={account.name} person size={28} />
          <span className={styles.accountName}>{account.name}</span>
          <IconChevronDown size={14} />
        </button>
      )}
    />
  );

  return (
    <ToastProvider>
      <div className={`ui ${styles.frame}`}>
        <header className={styles.top}>
          <button
            type="button"
            aria-label="Open menu"
            className={styles.menuButton}
            onClick={() => setDrawer(true)}
          >
            <IconMenu size={20} />
          </button>
          <Link
            href="/dashboard"
            className={styles.logoLink}
            aria-label="Trailwatch home"
          >
            <Logo light />
          </Link>
          <span className={styles.spacer} />
          {menu}
        </header>
        <div className={styles.columns}>
          <div className={styles.sidebar}>
            <Sidebar
              pathname={pathname}
              ownStore={ownStore}
              competitorCount={competitorCount}
              opportunityCount={opportunityCount}
              beta={beta}
              isAdmin={isAdmin}
              navDisabled={navDisabled}
              onFeedback={() => setFeedback(true)}
            />
          </div>
          <main className={styles.main}>{children}</main>
        </div>

        {drawer ? (
          <div
            className={styles.drawerOverlay}
            onMouseDown={(e) =>
              e.target === e.currentTarget && setDrawer(false)
            }
          >
            <div
              className={styles.drawer}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
            >
              <div className={styles.drawerHead}>
                <Logo height={20} />
                <button
                  type="button"
                  aria-label="Close menu"
                  className={styles.menuButton}
                  onClick={() => setDrawer(false)}
                >
                  <IconX size={20} />
                </button>
              </div>
              <Sidebar
                pathname={pathname}
                ownStore={ownStore}
                competitorCount={competitorCount}
                opportunityCount={opportunityCount}
                beta={beta}
                isAdmin={isAdmin}
                navDisabled={navDisabled}
                onNavigate={() => setDrawer(false)}
                onFeedback={() => {
                  setDrawer(false);
                  setFeedback(true);
                }}
              />
            </div>
          </div>
        ) : null}
        {/* Inside the .ui scope so it gets the app's tokens and Inter. */}
        <FeedbackModal open={feedback} onClose={() => setFeedback(false)} />
      </div>
    </ToastProvider>
  );
}
