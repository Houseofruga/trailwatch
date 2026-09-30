// When the Monday briefing happens, in US Eastern time (SPEC.md §5 Phase 4),
// DST-aware via Intl — no fixed UTC offset. Pure, so it's testable at any
// instant.
//
//   Sunday 18:00 ET →  briefings are prepared and submitted to the Batch API
//                      (non-urgent, 50% cheaper; results usually within an hour)
//   Monday 08:00 ET →  ready briefings are sent
//   Monday 11:00 ET →  stop waiting on the batch; unfinished ones go out
//                      without AI interpretation rather than not at all

const ZONE = "America/New_York";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const BRIEFING_SCHEDULE = { submitFromSundayHour: 18, sendFromMondayHour: 8, stopWaitingMondayHour: 11 };

export function easternParts(now: Date): { weekday: number; hour: number; date: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: ZONE,
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
