// Small status pieces: Stat, Spinner, ProgressBar, DividerWithLabel.
import { SpinnerIcon } from "./icons";
import styles from "./Feedback.module.css";

export function Stat({
  label,
  value,
  sub,
  size = "lg",
  loading,
}: {
  label: string;
  value?: React.ReactNode;
  sub?: React.ReactNode;
  /** lg = 24px (page stats), md = 20px (sidebar), sm = 18px (long values like a date). */
  size?: "lg" | "md" | "sm";
  loading?: boolean;
}) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      {loading ? (
        <span className={styles.statLoading}>
          <SpinnerIcon tone="#6e6b63" /> Loading…
        </span>
      ) : (
        <span className={`${styles.statValue} ${styles[size]}`}>{value}</span>
      )}
      {sub && !loading ? <span className={styles.statSub}>{sub}</span> : null}
    </div>
  );
}

export function Spinner({ label, size = 20 }: { label: string; size?: number }) {
  return (
    <div className={styles.spinner} role="status">
      <SpinnerIcon size={size} tone="#4a4740" />
      <span>{label}</span>
    </div>
  );
}

export function ProgressBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={styles.progress}>
      <div className={styles.progressText}>
        <span>{label}</span>
        <span className={styles.progressPct}>{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className={styles.track}
      >
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function DividerWithLabel({ children }: { children: React.ReactNode }) {
  return (
    <div role="separator" className={styles.divider}>
      <span className={styles.line} />
      {children}
      <span className={styles.line} />
    </div>
  );
}
