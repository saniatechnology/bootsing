/**
 * Small date helpers shared by the grid layout logic and the UI.
 *
 * All dates are treated as UTC midnight so that day-difference math
 * (`daysBetween`) is never off by one around a DST transition — the
 * calendar only ever cares about whole days, never times.
 */

import type { IsoDate } from "./types";

const MS_PER_DAY = 86_400_000;
const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function parseIsoDate(iso: IsoDate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIsoDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Whole-day difference `b - a`. Assumes both are UTC midnight. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

export function dayOfWeekAbbr(date: Date): string {
  return DAY_ABBR[date.getUTCDay()];
}

/** Format an optional start/end clock time, e.g. "21:00" or "21:00–23:00". Empty when no start time. */
export function fmtTimeRange(startTime: string | null, endTime: string | null): string {
  if (!startTime) return "";
  return endTime ? `${startTime}–${endTime}` : startTime;
}

export function fmtDateRange(start: Date, end: Date): string {
  const sMonth = MONTH_ABBR[start.getUTCMonth()];
  const eMonth = MONTH_ABBR[end.getUTCMonth()];
  if (start.getTime() === end.getTime()) return `${sMonth} ${start.getUTCDate()}`;
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${sMonth} ${start.getUTCDate()}–${end.getUTCDate()}`;
  }
  return `${sMonth} ${start.getUTCDate()} – ${eMonth} ${end.getUTCDate()}`;
}

/**
 * Clips [start, end] to the [weekStart, weekEnd] window.
 * Returns null if the range doesn't intersect the week at all.
 */
export function clipToWeek(
  start: Date,
  end: Date,
  weekStart: Date,
  weekEnd: Date
): [Date, Date] | null {
  const clippedStart = start > weekStart ? start : weekStart;
  const clippedEnd = end < weekEnd ? end : weekEnd;
  if (clippedStart > clippedEnd) return null;
  return [clippedStart, clippedEnd];
}
