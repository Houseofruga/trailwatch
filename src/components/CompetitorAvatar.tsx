"use client";

import { useState } from "react";
import styles from "./CompetitorAvatar.module.css";

// Shows a competitor's favicon as their logo, falling back to the two-letter
// initials (the previous behaviour) when there's no URL or the icon fails to
// load. Rendered inside the caller's existing avatar box — pass that box's class
// as `className` so sizing/background stay consistent per page.
//
// The icon comes from Google's favicon service (keyed by domain), so there's no
// backend or stored asset. Trade-off: it discloses the competitor's domain to
// that service at render time; swap the URL builder for a first-party proxy if
// that ever matters.
function domainOf(raw: string): string | null {
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function CompetitorAvatar({
  url,
  name,
  className,
}: {
  url?: string | null;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const domain = url ? domainOf(url) : null;
  const showIcon = domain && !failed;

  return (
    <span className={className}>
      {showIcon ? (
        // eslint-disable-next-line @next/next/no-img-element -- external favicon, no next/image loader
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
          alt=""
          aria-hidden="true"
          className={styles.favicon}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}
