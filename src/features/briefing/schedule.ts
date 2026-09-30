// When the Monday briefing happens, in US Eastern time (SPEC.md §5 Phase 4),
// DST-aware via Intl — no fixed UTC offset. Pure, so it's testable at any
// instant.
//
//   Sunday 18:00 ET →  briefings are prepared and submitted to the Batch API
//                      (non-urgent, 50% cheaper; results usually within an hour)
//   Monday 06:00 ET →  ready briefings are sent, each at its user's chosen
//                      Monday hour (6–11 AM) in their own time zone
//   Monday 11:00 ET →  stop waiting on the batch; unfinished ones go out
//                      without AI interpretation rather than not at all

const ZONE = "America/New_York";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const BRIEFING_SCHEDULE = { submitFromSundayHour: 18, sendFromMondayHour: 6, stopWaitingMondayHour: 11 };

/** The default when a user hasn't picked a time: Monday 8:00 AM US Eastern. */
export const DEFAULT_BRIEFING = { hour: 8, timeZone: ZONE };

export function easternParts(now: Date): { weekday: number; hour: number; date: string } {
  return zonedParts(now, ZONE);
}

function zonedParts(now: Date, timeZone: string): { weekday: number; hour: number; date: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    weekday: WEEKDAYS.indexOf(parts.weekday),
    hour: Number(parts.hour),
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The Monday (ET date) a briefing run belongs to, or null outside Sunday–Monday ET. */
export function briefingWeek(now: Date): string | null {
  const { weekday, date } = easternParts(now);
  if (weekday === 0) return addDays(date, 1);
  if (weekday === 1) return date;
  return null;
}

export function canSubmit(now: Date): boolean {
  const { weekday, hour } = easternParts(now);
  return (weekday === 0 && hour >= BRIEFING_SCHEDULE.submitFromSundayHour) || weekday === 1;
}

export function canSend(now: Date): boolean {
  const { weekday, hour } = easternParts(now);
  return weekday === 1 && hour >= BRIEFING_SCHEDULE.sendFromMondayHour;
}

export function stopWaiting(now: Date): boolean {
  const { weekday, hour } = easternParts(now);
  return weekday === 1 && hour >= BRIEFING_SCHEDULE.stopWaitingMondayHour;
}

function safeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return ZONE;
  }
}

/** Is it Monday at or past the user's briefing hour, in their time zone? */
export function userBriefingDue(now: Date, hour: number, timeZone: string): boolean {
  const local = zonedParts(now, safeZone(timeZone));
  return local.weekday === 1 && local.hour >= hour;
}

// The UTC instant of a wall-clock time in a zone (two passes settle DST edges).
function zonedInstant(date: string, hour: number, timeZone: string): Date {
  const wanted = Date.parse(`${date}T${String(hour).padStart(2, "0")}:00:00Z`);
  let guess = wanted;
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(guess), timeZone);
    const shown = Date.parse(`${p.date}T${String(p.hour).padStart(2, "0")}:00:00Z`);
    guess += wanted - shown;
  }
  return new Date(guess);
}

/** When the user's next Monday briefing goes out (their hour, their zone). */
export function nextBriefingAt(now: Date, hour: number, timeZone: string): Date {
  const zone = safeZone(timeZone);
  const local = zonedParts(now, zone);
  let days = (8 - local.weekday) % 7; // days until Monday
  if (days === 0 && local.hour >= hour) days = 7;
  return zonedInstant(addDays(local.date, days), hour, zone);
}
