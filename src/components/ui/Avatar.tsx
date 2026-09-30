import { IconImage } from "./icons";
import styles from "./Avatar.module.css";

const TONES = 5;

// Stable colour per store name, so a store keeps its colour everywhere.
function toneFor(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % TONES) + 1;
}

/** Lettered square for a store (favicon when we have one), round initials for a person. */
export function Avatar({
  name,
  size = 20,
  person,
  src,
}: {
  name: string;
  size?: 20 | 28 | 32 | 36;
  person?: boolean;
  src?: string | null;
}) {
  const letter = (name.trim()[0] ?? "?").toUpperCase();
  const style = {
    width: size,
    height: size,
    fontSize: size <= 20 ? 8 : size <= 28 ? 11 : 13,
    borderRadius: person ? 999 : size <= 20 ? 5 : 6,
    background: person ? "var(--ui-avatar)" : `var(--ui-avatar-${toneFor(name)})`,
  };
  return (
    <span className={styles.avatar} style={style} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- remote favicons, tiny */}
      {src ? <img src={src} alt="" className={styles.img} /> : letter}
    </span>
  );
}

/** Product image slot; shows a placeholder icon when there's no image. */
export function Thumbnail({ src, size = 28 }: { src?: string | null; size?: 28 | 40 }) {
  return (
    <span className={styles.thumb} style={{ width: size, height: size }} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- remote product images from competitor stores */}
      {src ? <img src={src} alt="" className={styles.img} loading="lazy" /> : <IconImage size={12} />}
    </span>
  );
}
