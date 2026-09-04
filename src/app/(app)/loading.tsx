import { Skeleton } from "@/components/Skeleton";
import styles from "./loading.module.css";

// Shown instantly on navigation to any (app) route while the page's server
// data loads and streams in. The sidebar (from layout.tsx) stays put; only
// this main-content area swaps. Its shape mirrors the dashboard — a header,
// three stat tiles, then a couple of cards — which is close enough for the
// other pages that the point (the app is responding) always lands.
export default function AppLoading() {
  return (
    <div className={styles.wrap} aria-busy="true" aria-label="Loading">
      <div className={styles.head}>
        <Skeleton width={220} height={30} />
        <Skeleton width={340} height={16} />
      </div>

      <div className={styles.stats}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.stat}>
            <Skeleton width={120} height={14} />
            <Skeleton width={48} height={28} />
          </div>
        ))}
      </div>

      <div className={styles.cards}>
        {[0, 1].map((i) => (
          <div key={i} className={styles.card}>
            <Skeleton width={180} height={20} />
            <Skeleton width="100%" height={14} />
            <Skeleton width="75%" height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}
