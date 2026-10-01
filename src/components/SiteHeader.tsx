import Link from "next/link";
import { Button } from "@/components/ui/Button";
import styles from "./SiteHeader.module.css";

/** Shared top nav — logo, Log in, Join the beta. Identical on every public page
 *  (marketing landing, tools, legal): same elements, same landing-width
 *  container, the app's Shopify-style buttons and type (`ui`). Auth pages use
 *  their own logo-only head. */
export function SiteHeader({ onDark = false }: { onDark?: boolean }) {
  return (
    <header className={`ui ${styles.header} ${onDark ? styles.onDark : ""}`}>
      <div className={styles.inner}>
        <Link href="/" aria-label="TrailWatch home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.logo} src="/logo.svg" alt="TrailWatch" />
        </Link>
        <div className={styles.actions}>
          <Button variant="plainDark" href="/login" className={styles.login}>
            Log in
          </Button>
          <Button variant="primary" href="/login?mode=signup">
            Join the beta
          </Button>
        </div>
      </div>
    </header>
  );
}
