"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logOut } from "@/features/auth/actions";
import { Avatar } from "./Avatar";
import { Badge } from "./Badge";
import { PopoverMenu } from "./Overlay";
import { ToastProvider } from "./Toast";
import { IconChevronDown, IconEye, IconHelp, IconHome, IconLogOut, IconMenu, IconSliders, IconX } from "./icons";
import styles from "./AppFrame.module.css";

export const SUPPORT_EMAIL = "trailwatch@houseofruga.com";

const NAV = [
  { href: "/dashboard", label: "Home", Icon: IconHome },
  { href: "/competitors", label: "Competitors", Icon: IconEye },
  { href: "/settings", label: "Settings", Icon: IconSliders },
] as const;

type Props = {
  account: { name: string; email: string };
  ownStore: { domain: string; products: number } | null;
  competitorCount: number;
  /** Onboarding: nav items shown but not usable. */
  navDisabled?: boolean;
  children: React.ReactNode;
};

function Logo({ height = 22 }: { height?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.svg" alt="TrailWatch" height={height} width={Math.round(height * 4.52)} className={styles.logo} />;
}

function Sidebar({
  pathname,
  ownStore,
  competitorCount,
  navDisabled,
  onNavigate,
}: Omit<Props, "account" | "children"> & { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className={styles.nav}>
      <ul className={styles.navList}>
        {NAV.map(({ href, label, Icon }) => {
          const current = !navDisabled && (pathname === href || pathname.startsWith(`${href}/`));
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
                {label === "Competitors" && competitorCount > 0 ? (
                  <span className={styles.count}>{competitorCount}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className={styles.store}>
        <span className={styles.storeLabel}>Your store</span>
        {ownStore ? (
          <span className={styles.storeName}>
            {ownStore.domain} <span className={styles.storeCount}>· {ownStore.products.toLocaleString("en-US")} products</span>
          </span>
        ) : (
          <Link href="/settings#your-store" className={styles.storeAdd} onClick={onNavigate}>
            Add your store
          </Link>
        )}
        <span className={styles.storeBadge}>
          <Badge tone="success">Free beta</Badge>
        </span>
      </div>
    </nav>
  );
}

/** Top bar + left sidebar (a drawer on phones) around every signed-in screen. */
export function AppFrame({ account, ownStore, competitorCount, navDisabled, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  const menu = (
    <PopoverMenu
      width={200}
      items={[
        { label: "Settings", icon: <IconSliders />, onSelect: () => router.push("/settings") },
        { label: "Help", icon: <IconHelp />, onSelect: () => (window.location.href = `mailto:${SUPPORT_EMAIL}`) },
        { label: "Log out", icon: <IconLogOut />, onSelect: () => void logOut(), separated: true },
      ]}
      trigger={(p) => (
        <button type="button" className={styles.account} aria-label={`Account menu for ${account.name}`} {...p}>
          <Avatar name={account.name} person size={28} />
          <span className={styles.accountName}>{account.name}</span>
          <IconChevronDown size={14} />
        </button>
      )}
    />
  );

  return (
    <ToastProvider>
      <div className={styles.frame}>
        <header className={styles.top}>
          <button type="button" aria-label="Open menu" className={styles.menuButton} onClick={() => setDrawer(true)}>
            <IconMenu size={20} />
          </button>
          <Link href="/dashboard" className={styles.logoLink} aria-label="TrailWatch home">
            <Logo />
          </Link>
          <span className={styles.spacer} />
          {menu}
        </header>
        <div className={styles.columns}>
          <div className={styles.sidebar}>
            <Sidebar pathname={pathname} ownStore={ownStore} competitorCount={competitorCount} navDisabled={navDisabled} />
          </div>
          <main className={styles.main}>{children}</main>
        </div>

        {drawer ? (
          <div className={styles.drawerOverlay} onMouseDown={(e) => e.target === e.currentTarget && setDrawer(false)}>
            <div className={styles.drawer} role="dialog" aria-modal="true" aria-label="Menu">
              <div className={styles.drawerHead}>
                <Logo height={20} />
                <button type="button" aria-label="Close menu" className={styles.menuButton} onClick={() => setDrawer(false)}>
                  <IconX size={20} />
                </button>
              </div>
              <Sidebar
                pathname={pathname}
                ownStore={ownStore}
                competitorCount={competitorCount}
                navDisabled={navDisabled}
                onNavigate={() => setDrawer(false)}
              />
            </div>
          </div>
        ) : null}
      </div>
    </ToastProvider>
  );
}
