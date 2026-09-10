"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { usePathname } from "next/navigation";
import { logOut } from "@/features/auth/actions";
import type { Account } from "@/features/account/queries";
import { LIMITS, PLAN_LABEL } from "@/features/plan/limits";
import {
  DashboardIcon,
  CompetitorsIcon,
  BillingIcon,
  SettingsIcon,
  LogoutIcon,
} from "@/components/icons";
import styles from "./Sidebar.module.css";

// The digest is email-only (no in-app page — an in-app history is out of scope
// per SPEC §6), so it isn't a nav destination.
const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/competitors", label: "Competitors", Icon: CompetitorsIcon },
  { href: "/billing", label: "Plan & billing", Icon: BillingIcon },
  { href: "/settings", label: "Settings", Icon: SettingsIcon },
] as const;

function percent(used: number, allowed: number): string {
  if (allowed <= 0) return "0%";
  return `${Math.min(100, (used / allowed) * 100)}%`;
}

// Which nav section a path belongs to — or null if the path is a sub-route that
// should NOT move the nav. A competitor detail page (`/competitors/[id]`) and the
// add-competitor modal (`/competitors/add`) are reachable from either Dashboard or
// Competitors; the nav should keep reflecting where the user came from, so those
// return null and the last real section stays highlighted. `/competitors` itself
// (the index) is a real section.
function sectionFromPath(path: string): string | null {
  if (path.startsWith("/competitors/")) return null;
  const item = NAV.find((n) => path === n.href || path.startsWith(`${n.href}/`));
  return item ? item.href : null;
}

export function Sidebar({ account }: { account: Account }) {
  const pathname = usePathname();
  // The highlighted nav section. It only advances when the user lands on a real
  // top-level section; sub-routes (competitor detail, add-competitor modal) leave
  // it where it was, so the nav reflects the section they navigated in from. The
  // Sidebar lives in the persistent app layout, so this state survives navigation.
  const [activeSection, setActiveSection] = useState<string>(
    () => sectionFromPath(pathname) ?? "/competitors",
  );
  const [menuOpen, setMenuOpen] = useState(false);
  // Mobile only: the account sheet raised from the top-bar avatar.
  const [accountOpen, setAccountOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Click-away, so the menu doesn't strand itself open.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  // Close the mobile account sheet whenever the route changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAccountOpen(false);
  }, [pathname]);

  // Advance the highlighted section only when the path is a real section (a
  // sub-route returns null and leaves the previous section in place).
  useEffect(() => {
    const section = sectionFromPath(pathname);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (section) setActiveSection(section);
  }, [pathname]);

  const limits = LIMITS[account.plan];
  const isFree = account.plan === "free";

  return (
    <>
      {/* ---- Mobile top bar: logo + account avatar (hidden on desktop) ---- */}
      <div className={styles.topbar}>
        <Image src="/logo.svg" alt="Trailwatch" width={132} height={29} className={styles.topbarLogo} priority />
        <button
          type="button"
          className={styles.topbarAvatar}
          onClick={() => setAccountOpen(true)}
          aria-label="Account"
          aria-haspopup="dialog"
        >
          {account.initials}
        </button>
      </div>

      {/* ---- Mobile bottom tab bar: primary navigation (hidden on desktop) ---- */}
      <nav className={styles.tabbar} aria-label="Primary">
        {NAV.map((item) => {
          const active = activeSection === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? styles.tabActive : styles.tab}
              aria-current={active ? "page" : undefined}
            >
              <span className={styles.tabIconWrap}>
                <item.Icon />
                {item.href === "/dashboard" && account.changesThisWeek > 0 ? (
                  <span className={styles.tabBadge}>{account.changesThisWeek}</span>
                ) : null}
              </span>
              <span className={styles.tabLabel}>{item.label === "Plan & billing" ? "Billing" : item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ---- Mobile account sheet (raised from the top-bar avatar) ---- */}
      {accountOpen ? (
        <>
          <div className={styles.sheetOverlay} onClick={() => setAccountOpen(false)} aria-hidden="true" />
          <div className={styles.sheet} role="dialog" aria-label="Account">
            <div className={styles.sheetHandle} />
            <div className={styles.sheetProfile}>
              <div className={styles.avatar}>{account.initials}</div>
              <div className={styles.profileText}>
                <div className={styles.profileName}>{account.displayName}</div>
                <div className={styles.profileEmail}>{account.email}</div>
              </div>
            </div>
            <div className={styles.sheetMeta}>
              <span>{PLAN_LABEL[account.plan]} plan</span>
              <span className={styles.meterValue}>
                {account.competitorCount}/{limits.competitors} competitors · {account.pageCount}/{account.pageAllowance} pages
              </span>
            </div>
            {isFree ? (
              <ButtonLink href="/billing" full className={styles.sheetUpgrade}>
                Upgrade to Pro
              </ButtonLink>
            ) : null}
            <form action={logOut}>
              <button type="submit" className={styles.sheetLogout}>
                <LogoutIcon />
                Log out
              </button>
            </form>
          </div>
        </>
      ) : null}

      {/* ---- Desktop sidebar (hidden on mobile) ---- */}
      <aside className={styles.aside}>
        <div className={styles.brand}>
        <Image
          src="/logo.svg"
          alt="Trailwatch"
          width={158}
          height={35}
          className={styles.logo}
          priority
        />
      </div>

      <nav className={styles.nav}>
        {NAV.map((item) => {
          const active = activeSection === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? styles.navItemActive : styles.navItem}
            >
              <span className={styles.navLabel}>
                <item.Icon />
                {item.label}
              </span>
              {item.href === "/dashboard" && account.changesThisWeek > 0 ? (
                <span className={styles.badge}>{account.changesThisWeek}</span>
              ) : null}
              {active ? <div className={styles.navBar} /> : null}
            </Link>
          );
        })}
      </nav>

      <div className={styles.foot}>
        <div className={styles.usage}>
          <div className={styles.usageHead}>
            <span className={styles.usagePlan}>{PLAN_LABEL[account.plan]} plan</span>
          </div>

          <div className={styles.meters}>
            <div className={styles.meterRow}>
              <span>Competitors</span>
              <span className={styles.meterValue}>
                {account.competitorCount} / {limits.competitors}
              </span>
            </div>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{ width: percent(account.competitorCount, limits.competitors) }}
              />
            </div>

            <div className={styles.meterRowSpaced}>
              <span>Pages tracked</span>
              <span className={styles.meterValue}>
                {account.pageCount} / {account.pageAllowance}
              </span>
            </div>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{ width: percent(account.pageCount, account.pageAllowance) }}
              />
            </div>
          </div>

          {isFree ? (
            <ButtonLink href="/billing" full className={styles.upgradeBtn}>
              Upgrade to Pro
            </ButtonLink>
          ) : null}
        </div>

        <div className={styles.profile} ref={profileRef}>
          <button
            type="button"
            className={styles.profileRow}
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <div className={styles.avatar}>{account.initials}</div>
            <div className={styles.profileText}>
              <div className={styles.profileName}>{account.displayName}</div>
              <div className={styles.profileEmail}>{account.email}</div>
            </div>
            <span className={styles.chevron}>
              <svg width="11" height="14" viewBox="0 0 11 14" fill="none" aria-hidden="true">
                <path
                  d="M3 5.5 5.5 3 8 5.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 8.5 5.5 11 8 8.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>

          {menuOpen ? (
            <div className={styles.menu} role="menu">
              <form action={logOut}>
                <button type="submit" className={styles.menuItemDanger}>
                  <LogoutIcon />
                  Log out
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
      </aside>
    </>
  );
}
