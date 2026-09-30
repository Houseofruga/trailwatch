import Link from "next/link";
import styles from "./AuthShell.module.css";

/** 01-Sign up / log in: centred card on the grey background, logo above, legal links below. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`ui ${styles.page}`}>
      <div className={styles.column}>
        <Link href="/" className={styles.logoLink} aria-label="TrailWatch home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="TrailWatch" width={136} height={30} className={styles.logo} />
        </Link>
        {children}
        <div className={styles.legal}>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>
    </div>
  );
}

/** The white card: body, then an optional subdued footer strip. */
export function AuthCard({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className={styles.card}>
      <div className={styles.body}>{children}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </section>
  );
}

export function AuthHeading({ title, sub }: { title: string; sub?: React.ReactNode }) {
  return (
    <div className={styles.heading}>
      <h1 className={styles.title}>{title}</h1>
      {sub ? <p className={styles.sub}>{sub}</p> : null}
    </div>
  );
}
