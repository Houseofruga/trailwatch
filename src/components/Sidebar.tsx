"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { usePathname } from "next/navigation";
import { logOut } from "@/features/auth/actions";
import type { Account } from "@/features/account/queries";
import { LIMITS, PLAN_LABEL } from "@/features/plan/limits";
import styles from "./Sidebar.module.css";

// The digest is email-only (no in-app page — an in-app history is out of scope
// per SPEC §6), so it isn't a nav destination.
const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/competitors", label: "Competitors" },
  { href: "/billing", label: "Plan & billing" },
] as const;

function percent(used: number, allowed: number): string {
  if (allowed <= 0) return "0%";
  return `${Math.min(100, (used / allowed) * 100)}%`;
}

export function Sidebar({ account }: { account: Account }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
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

  const limits = LIMITS[account.plan];
  const isFree = account.plan === "free";

  return (
    <aside className={styles.aside}>
      <div className={styles.brand}>
        <Image
          src="/logo.svg"
          alt="Trailwatch"
          width={159}
          height={42}
          className={styles.logo}
          priority
        />
      </div>

      <nav className={styles.nav}>
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? styles.navItemActive : styles.navItem}
            >
              <span>{item.label}</span>
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
              <Link href="/settings" className={styles.menuItem} role="menuitem">
                Settings
              </Link>
              <form action={logOut}>
                <button type="submit" className={styles.menuItemDanger}>
                  Log out
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
