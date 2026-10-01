// Display formatting for the app screens. Times show in the user's briefing
// time zone (US Eastern until the per-user setting lands in Step 6).

export const DISPLAY_TIME_ZONE = "America/New_York";

export function money(cents: number | null | undefined, opts: { whole?: boolean } = {}): string {
  if (cents == null) return "—";
  const dollars = cents / 100;
  return opts.whole && Number.isInteger(dollars)
    ? `$${dollars.toLocaleString("en-US")}`
    : `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function count(n: number | null | undefined): string {
  return n == null ? "—" : n.toLocaleString("en-US");
}

const dayKey = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: DISPLAY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

function daysBetween(a: Date, b: Date): number {
  return Math.round((Date.parse(dayKey(b)) - Date.parse(dayKey(a))) / 86_400_000);
}

const fmt = (d: Date, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { timeZone: DISPLAY_TIME_ZONE, ...o }).format(d);

/** "Sep 27" */
export const shortDate = (iso: string) => fmt(new Date(iso), { month: "short", day: "numeric" });

/** "4:12 PM" */
export const clockTime = (iso: string) => fmt(new Date(iso), { hour: "numeric", minute: "2-digit" });

/** "2h ago", "Yesterday", "Sep 27" (feed "When" column). */
export function when(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const mins = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (mins < 60) return mins <= 1 ? "Just now" : `${mins} min ago`;
  const days = daysBetween(d, now);
  if (days === 0) return `${Math.round(mins / 60)}h ago`;
  if (days === 1) return "Yesterday";
  return shortDate(iso);
}

/** "14 min ago", "1 h ago", "Sep 28" (last checked). */
export function ago(iso: string, now: Date = new Date()): string {
  const mins = Math.round((now.getTime() - Date.parse(iso)) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return shortDate(iso);
}

/** Timeline day header: "Today · Wed, Sep 30", "Yesterday · Tue, Sep 29", "Fri, Sep 25". */
export function dayHeading(iso: string, now: Date = new Date()): string {
  const label = fmt(new Date(iso), { weekday: "short", month: "short", day: "numeric" });
  const days = daysBetween(new Date(iso), now);
  return days === 0 ? `Today · ${label}` : days === 1 ? `Yesterday · ${label}` : label;
}

export { dayKey };

/** "Mon, Oct 5, 8:00 AM", in the time zone the user picked for the briefing. */
export const briefingTime = (iso: string, timeZone: string = DISPLAY_TIME_ZONE) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
