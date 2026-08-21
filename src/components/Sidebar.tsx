"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logOut } from "@/features/auth/actions";
import type { Account } from "@/features/account/queries";
import { LIMITS, PLAN_LABEL, PLAN_PRICE } from "@/features/plan/limits";
import styles from "./Sidebar.module.css";

// `pending` routes are built in later slices; they render in place but don't
// navigate, rather than linking to a 404.
const NAV = [
  { href: "/dashboard", label: "Dashboard", pending: false },
  { href: "/competitors", label: "Competitors", pending: false },
  { href: "/digest", label: "Weekly digest", pending: true },
  { href: "/billing", label: "Plan & billing", pending: false },
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

          if (item.pending) {
            return (
              <span key={item.href} className={styles.navItemPending}>
                {item.label}
              </span>
            );
          }

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
            <span className={styles.usagePrice}>{PLAN_PRICE[account.plan]}</span>
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
            <Link href="/billing" className={styles.upgrade}>
              Upgrade to Pro &rarr;
            </Link>
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
            <span className={menuOpen ? styles.chevronOpen : styles.chevron}>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
                <path
                  d="M1 1l4 4 4-4"
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
              {/* No settings screen exists in the design yet — see the slice-1 plan. */}
              <span className={styles.menuItemDisabled}>Settings</span>
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
