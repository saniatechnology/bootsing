/**
 * Pure layout logic for one week of the calendar grid: figure out which
 * events fall in the week, clip their date range to it, and order them
 * so that short one-off events float to the top and long-running ones
 * sink to the bottom. This has no rendering concerns at all — it's kept
 * separate from the React components so it's easy to unit test and easy
 * to reuse if the UI layer ever changes.
 */

import { addDays, clipToWeek, daysBetween, parseIsoDate } from "./dates";
import type { CalendarEvent, IsoDate } from "./types";

export interface WeekRow {
  event: CalendarEvent;
  /** 1-based row/order index within the week, used for the numbered badge. */
  index: number;
  /** 1-based grid column where this event's bar starts. */
  colStart: number;
  /** How many day-columns this event's bar spans. */
  span: number;
  clippedStart: Date;
  clippedEnd: Date;
}

export interface WeekLayout {
  weekStart: Date;
  weekEnd: Date;
  /** Number of day columns in this week (usually 7; the first week may be partial). */
  dayCount: number;
  days: Date[];
  rows: WeekRow[];
}

export function buildWeekLayout(
  events: CalendarEvent[],
  [weekStartIso, weekEndIso]: [IsoDate, IsoDate]
): WeekLayout {
  const weekStart = parseIsoDate(weekStartIso);
  const weekEnd = parseIsoDate(weekEndIso);
  const dayCount = daysBetween(weekStart, weekEnd) + 1;

  const days: Date[] = [];
  for (let i = 0; i < dayCount; i++) days.push(addDays(weekStart, i));

  const candidates = events
    .map((event) => {
      const start = parseIsoDate(event.start);
      const end = parseIsoDate(event.end);
      const clipped = clipToWeek(start, end, weekStart, weekEnd);
      if (!clipped) return null;
      const [clippedStart, clippedEnd] = clipped;
      const fullDuration = daysBetween(start, end) + 1;
      return { event, clippedStart, clippedEnd, fullDuration };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  // Shorter full-duration events first, then earlier starts first — this is
  // what makes one-off nights float above multi-week exhibitions.
  candidates.sort(
    (a, b) =>
      a.fullDuration - b.fullDuration ||
      a.clippedStart.getTime() - b.clippedStart.getTime()
  );

  const rows: WeekRow[] = candidates.map((c, i) => ({
    event: c.event,
    index: i + 1,
    colStart: daysBetween(weekStart, c.clippedStart) + 1,
    span: daysBetween(c.clippedStart, c.clippedEnd) + 1,
    clippedStart: c.clippedStart,
    clippedEnd: c.clippedEnd,
  }));

  return { weekStart, weekEnd, dayCount, days, rows };
}
