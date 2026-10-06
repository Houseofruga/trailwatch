// The "‹ Back to where you came from" link on a detail page.
//
// A link into a detail page can carry `?from=<origin>`; the page then labels
// its back link with that origin instead of its own section. The app frame
// records the path on every navigation, so the page also knows whether the
// origin really is the previous page in this tab. If it is, going back in
// history returns the visitor to the same scroll position; otherwise the link
// simply opens the origin.

export const ORIGINS = {
  home: { href: "/dashboard", label: "Home" },
} as const;

export type Origin = keyof typeof ORIGINS;

export const originOf = (from: string | null): Origin | null => (from && from in ORIGINS ? (from as Origin) : null);

const CURRENT = "tw_path";
const PREVIOUS = "tw_prev_path";

/** Called by the app frame whenever the path changes. */
export function recordPath(pathname: string): void {
  try {
    const current = sessionStorage.getItem(CURRENT);
    if (current === pathname) return;
    if (current) sessionStorage.setItem(PREVIOUS, current);
    sessionStorage.setItem(CURRENT, pathname);
  } catch {
    // Storage blocked: back links fall back to plain navigation.
  }
}

/** True when `href` is the page this tab was on just before the current one. */
export function cameStraightFrom(href: string): boolean {
  try {
    return window.history.length > 1 && sessionStorage.getItem(PREVIOUS) === href;
  } catch {
    return false;
  }
}
