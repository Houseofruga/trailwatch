"use client";

import { useState } from "react";
import styles from "./CompetitorAvatar.module.css";

// Shows a competitor's favicon as their logo, falling back to the two-letter
// initials when there's no URL or the icon fails to load. Rendered inside the
// caller's existing avatar box — pass that box's class as `className` so
// sizing/background stay consistent per page.
//
// The icon is served by our own /api/favicon proxy, which fetches the
// competitor's favicon server-side (SSRF-safe) — so the viewer's browser never
// discloses which competitors they track to a third-party icon service.
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
        // eslint-disable-next-line @next/next/no-img-element -- proxied favicon, no next/image loader
        <img
          src={`/api/favicon?domain=${encodeURIComponent(domain)}`}
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
