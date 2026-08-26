"use client";

import { useCallback, useRef, useState } from "react";
import styles from "./SiteFooter.module.css";

/**
 * Footer "Contact" affordance. A bare mailto: link silently does nothing for
 * visitors without a registered mail app (webmail users, the preview browser),
 * so this keeps the mailto: for those who have a client AND copies the address
 * to the clipboard on click, showing a brief confirmation. Either way the
 * visitor ends up able to reach us.
 */
export function ContactLink({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onClick = useCallback(() => {
    // Don't preventDefault: if a mail client exists, let it open too.
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(email).then(
        () => {
          setCopied(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 2500);
        },
        () => {
          // Clipboard blocked — the mailto: fallback still applies.
        },
      );
    }
  }, [email]);

  return (
    <span className={styles.contact}>
      <a href={`mailto:${email}`} onClick={onClick}>
        Contact
      </a>
      <span className={styles.contactHint} role="status" aria-live="polite">
        {copied ? `Copied ${email}` : ""}
      </span>
    </span>
  );
}
