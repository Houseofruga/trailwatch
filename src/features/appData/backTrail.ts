// The "‹ Back to where you came from" links on detail pages.
//
// A link into a detail page can carry `?from=<origin>`; the page then labels
// its back link with that origin instead of its own section. The app frame
// keeps a copy of this tab's trail (the pages visited, in order, and where in
// that trail we are), so a page also knows whether a given page really is the
// one "behind" it. If it is, going back in history returns the visitor to the
// same scroll position; otherwise the link simply opens the page.
//
// The trail follows the browser's own history through several steps (Home →
// competitor → snapshot and back again), including the back and forward buttons.

export const ORIGINS = {
  home: { href: "/dashboard", label: "Home" },
} as const;

export type Origin = keyof typeof ORIGINS;

export const originOf = (from: string | null): Origin | null => (from && from in ORIGINS ? (from as Origin) : null);

const TRAIL = "tw_trail";
const HOME_URL = "tw_home_url";

type Trail = { pages: string[]; at: number };

function read(): Trail {
  try {
    const t = JSON.parse(sessionStorage.getItem(TRAIL) ?? "null") as Trail | null;
    if (t && Array.isArray(t.pages) && Number.isInteger(t.at) && t.at >= 0 && t.at < t.pages.length) return t;
  } catch {
    // Storage blocked or unreadable: start a fresh trail.
  }
  return { pages: [], at: -1 };
}

function write(t: Trail): void {
  try {
    sessionStorage.setItem(TRAIL, JSON.stringify({ pages: t.pages.slice(-50), at: Math.min(t.at, 49) }));
  } catch {
    // Storage blocked: back links fall back to plain navigation.
  }
}

/**
 * Called by the app frame whenever the path changes. `viaHistory` is true when
 * the change came from the browser's back or forward (a history step, not a new page).
 */
export function recordPath(pathname: string, viaHistory = false): void {
  const t = read();
  if (t.pages[t.at] === pathname) return;
  if (viaHistory) {
    if (t.pages[t.at - 1] === pathname) return write({ pages: t.pages, at: t.at - 1 });
    if (t.pages[t.at + 1] === pathname) return write({ pages: t.pages, at: t.at + 1 });
    // A jump we can't place (several steps at once): start over from here.
    return write({ pages: [pathname], at: 0 });
  }
  const pages = [...t.pages.slice(0, t.at + 1), pathname];
  write({ pages, at: pages.length - 1 });
}

/** True when `pathname` is the page directly behind this one in the tab's history. */
export function cameStraightFrom(pathname: string): boolean {
  try {
    const t = read();
    return window.history.length > 1 && t.at > 0 && t.pages[t.at - 1] === pathname;
  } catch {
    return false;
  }
}

/** Home writes its address (filters and page included) here, so a plain link back returns to the same list. */
export function rememberHomeUrl(url: string): void {
  try {
    sessionStorage.setItem(HOME_URL, url);
  } catch {
    // Storage blocked: the link opens Home unfiltered.
  }
}

/** Where an origin's back link points: Home as the visitor left it, when we know. */
export function originHref(origin: Origin): string {
  const fallback = ORIGINS[origin].href;
  try {
    const saved = origin === "home" ? sessionStorage.getItem(HOME_URL) : null;
    return saved && (saved === fallback || saved.startsWith(`${fallback}?`)) ? saved : fallback;
  } catch {
    return fallback;
  }
}
