"use client";

import { useEffect, useRef, useState } from "react";
import { IconImage } from "./icons";
import styles from "./Avatar.module.css";

const TONES = 5;

// Stable colour per store name, so a store keeps its colour everywhere.
function toneFor(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % TONES) + 1;
}

/**
 * Lettered square for a store, round initials for a person. With a `domain`,
 * shows the store's favicon via our own /api/favicon proxy (so no third-party
 * icon service learns which stores a user tracks), and falls back to the
 * letter if there's no icon.
 */
export function Avatar({
  name,
  size = 20,
  person,
  domain,
}: {
  name: string;
  size?: 20 | 28 | 32 | 36;
  person?: boolean;
  domain?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // An icon that failed before hydration never fires onError: check on mount.
  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth === 0) setFailed(true);
  }, []);
  const letter = (name.trim()[0] ?? "?").toUpperCase();
  const host = domain?.trim().toLowerCase().replace(/^www\./, "");
  const icon = !person && host && !failed;
  const style = {
    width: size,
    height: size,
    fontSize: size <= 20 ? 8 : size <= 28 ? 11 : 13,
    borderRadius: person ? 999 : size <= 20 ? 5 : 6,
    background: icon ? "var(--surface)" : person ? "var(--ui-avatar)" : `var(--ui-avatar-${toneFor(name)})`,
  };
  return (
    <span className={`${styles.avatar} ${icon ? styles.withIcon : ""}`} style={style} aria-hidden="true">
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element -- proxied favicon, no next/image loader
        <img
          ref={img}
          src={`/api/favicon?domain=${encodeURIComponent(host)}`}
          alt=""
          className={styles.icon}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        letter
      )}
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
