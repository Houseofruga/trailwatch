import Link from "next/link";
import { IconChevronLeft } from "./icons";
import styles from "./Page.module.css";

/**
 * Page header: optional breadcrumb, title (with optional leading avatar and
 * trailing badges), actions on the right (they wrap below the title on
 * mobile), optional subtitle line.
 */
export function PageHeader({
  title,
  breadcrumb,
  leading,
  badges,
  actions,
  subtitle,
}: {
  title: string;
  breadcrumb?: { href: string; label: string };
  leading?: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className={styles.header}>
      {breadcrumb ? (
        <Link href={breadcrumb.href} className={styles.breadcrumb}>
          <IconChevronLeft />
          {breadcrumb.label}
        </Link>
      ) : null}
      <div className={styles.row}>
        <div className={styles.titleGroup}>
          {leading}
          <h1 className={styles.title}>{title}</h1>
          {badges}
        </div>
        {subtitle ? <p className={`${styles.subtitle} ${styles.subtitleMobile}`}>{subtitle}</p> : null}
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {subtitle ? <p className={`${styles.subtitle} ${styles.subtitleDesktop}`}>{subtitle}</p> : null}
    </div>
  );
}

/** Centered content column inside the app frame (1040px; 880px for reading lists; 600px for onboarding). */
export function PageBody({ children, narrow, medium }: { children: React.ReactNode; narrow?: boolean; medium?: boolean }) {
  return <div className={`${styles.body} ${narrow ? styles.narrow : ""} ${medium ? styles.medium : ""}`}>{children}</div>;
}
