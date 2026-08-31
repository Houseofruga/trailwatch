import styles from "./CompareTable.module.css";

// Two-column comparison table used by the /compare/* pages: the competitor on
// the left (muted), TrailWatch on the right (inked, logo header). Server
// component — pure presentation, no state.
export function CompareTable({
  competitorName,
  rows,
}: {
  competitorName: string;
  rows: Array<{ them: string; us: string }>;
}) {
  return (
    <div className={styles.compare}>
      <div className={`${styles.row} ${styles.head}`}>
        <div className={styles.cell}>{competitorName}</div>
        <div className={`${styles.cell} ${styles.tw}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.logo} src="/logo.svg" alt="TrailWatch" />
        </div>
      </div>
      {rows.map((row, i) => (
        <div key={i} className={styles.row}>
          <div className={styles.cell}>{row.them}</div>
          <div className={`${styles.cell} ${styles.tw}`}>{row.us}</div>
        </div>
      ))}
    </div>
  );
}
