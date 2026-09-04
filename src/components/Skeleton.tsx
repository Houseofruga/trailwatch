import styles from "./Skeleton.module.css";

/**
 * A single shimmering placeholder bar. Compose these to shape a loading state
 * that roughly matches the page that's coming, so navigation feels instant
 * instead of frozen. Decorative only — hidden from assistive tech.
 */
export function Skeleton({
  width = "100%",
  height = 16,
  radius,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
}) {
  return (
    <div
      aria-hidden
      className={styles.bar}
      style={{ width, height, borderRadius: radius }}
    />
  );
}
