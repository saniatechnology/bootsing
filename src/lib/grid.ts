/**
 * Pure layout logic for one week of the calendar grid: figure out which
 * events fall in the week, clip their date range to it, and order them
 * so that short one-off events float to the top and long-running ones
 * sink to the bottom. This has no rendering concerns at all — it's kept
 * separate from the React components so it's easy to unit test and easy
 * to reuse if the UI layer ever changes.
 */

import { addDays, clipToWeek, daysBetween, parseIsoDate } from "./dates";
import type { CalendarEvent } from "./types";
import type { WeekRange } from "./weeks";

export interface WeekRow {
  event: CalendarEvent;
  /** 1-based number within the week, used for the badge and the detail row. */
  index: number;
  /** 1-based grid column where this event's bar starts. */
  colStart: number;
  /** How many day-columns this event's bar spans. */
  span: number;
  /** 0-based grid lane: events pack into the lowest free lane so they rise to the top. */
  lane: number;
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
  /** How many lanes the packed events occupy (grid row count below the header). */
  laneCount: number;
}

export function buildWeekLayout(
  events: CalendarEvent[],
  [weekStartIso, weekEndIso]: WeekRange
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
    (a, b) => a.fullDuration - b.fullDuration || a.clippedStart.getTime() - b.clippedStart.getTime()
  );

  // Pack each bar into the lowest lane whose day-columns are still free, so
  // events rise to the top of their day instead of each taking its own row.
  const laneCols: Set<number>[] = [];
  const rows: WeekRow[] = candidates.map((c, i) => {
    const colStart = daysBetween(weekStart, c.clippedStart) + 1;
    const span = daysBetween(c.clippedStart, c.clippedEnd) + 1;
    const cols: number[] = [];
    for (let x = colStart; x < colStart + span; x++) cols.push(x);

    let lane = 0;
    for (;;) {
      if (!laneCols[lane]) laneCols[lane] = new Set();
      if (!cols.some((x) => laneCols[lane].has(x))) break;
      lane++;
    }
    cols.forEach((x) => laneCols[lane].add(x));

    return {
      event: c.event,
      index: i + 1,
      colStart,
      span,
      lane,
      clippedStart: c.clippedStart,
      clippedEnd: c.clippedEnd,
    };
  });

  return { weekStart, weekEnd, dayCount, days, rows, laneCount: laneCols.length };
}
