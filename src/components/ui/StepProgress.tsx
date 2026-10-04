import styles from "./StepProgress.module.css";

/** "Feedback calls: 1 of 3" with a bar per step (NEW COMPONENT: Three-step progress row, DESIGN 12-Beta). */
export function StepProgress({ label, done, total, compact }: { label: string; done: number; total: number; compact?: boolean }) {
  return (
    <div role="group" aria-label={label} className={`${styles.row} ${compact ? styles.compact : ""}`}>
      <span className={styles.label}>{label}</span>
      <span aria-hidden="true" className={styles.bars}>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`${styles.bar} ${i < done ? styles.done : ""}`} />
        ))}
      </span>
    </div>
  );
}
