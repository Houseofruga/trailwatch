import Link from "next/link";
import styles from "./ErrorState.module.css";

/**
 * Shared presentation for the error / 404 boundaries. Kept dependency-light
 * (design tokens only) so it renders even when something upstream is broken.
 */
export function ErrorState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.mark}>
        <div className={styles.markDot} />
      </div>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.body}>{body}</p>
      <div className={styles.actions}>{action}</div>
    </div>
  );
}

/** A plain link home — used by the 404 and as a fallback action. */
export function HomeLink({ children = "Back to dashboard", href = "/dashboard" }: { children?: React.ReactNode; href?: string }) {
  return (
    <Link href={href} className={styles.button}>
      {children}
    </Link>
  );
}
