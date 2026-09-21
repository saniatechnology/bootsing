/**
 * Pure layout logic for the Home page's hourly week view. Timed single-day
 * events are placed on a vertical minute axis and packed side-by-side when
 * they overlap; everything else (no start time, or spanning multiple days)
 * goes into an "all-day" band above the grid. Like grid.ts, this has no
 * rendering concerns so it can be unit-tested in isolation.
 */

import { addDays, clipToWeek, daysBetween, parseIsoDate } from "./dates";
import type { CalendarEvent, IsoDate } from "./types";

/** Minutes shown for a timed event that has no end time. */
export const DEFAULT_DURATION_MIN = 90;
const MINUTES_PER_DAY = 1440;

/** Parse "HH:MM" (24h) into minutes since midnight; null if malformed. */
export function parseMinutes(time: string | null): number | null {
  if (!time) return null;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export interface HourlyTimedItem {
  event: CalendarEvent;
  /** 0-based day column. */
  dayIndex: number;
  startMin: number;
  /** Exclusive end; may exceed 1440 when the event runs past midnight. */
  endMin: number;
  /** 0-based sub-column within the day for overlapping events. */
  lane: number;
  /** Total sub-columns in this day, so widths can be computed as 1/laneCount. */
  laneCount: number;
}

export interface HourlyUntimedItem {
  event: CalendarEvent;
  /** 1-based grid column where the bar starts. */
  colStart: number;
  /** How many day-columns the bar spans. */
  span: number;
}

export interface HourlyLayout {
  weekStart: Date;
  weekEnd: Date;
  dayCount: number;
  days: Date[];
  /** Axis bounds in minutes (rounded to the hour); end may exceed 1440. */
  axisStartMin: number;
  axisEndMin: number;
  /** Hour marks (in minutes) from axisStart to axisEnd, inclusive of the start. */
  hours: number[];
  timed: HourlyTimedItem[];
  untimed: HourlyUntimedItem[];
  hasTimed: boolean;
}

const floorHour = (min: number) => Math.floor(min / 60) * 60;
const ceilHour = (min: number) => Math.ceil(min / 60) * 60;

export function buildHourlyWeekLayout(
  events: CalendarEvent[],
  [weekStartIso, weekEndIso]: [IsoDate, IsoDate]
): HourlyLayout {
  const weekStart = parseIsoDate(weekStartIso);
  const weekEnd = parseIsoDate(weekEndIso);
  const dayCount = daysBetween(weekStart, weekEnd) + 1;
  const days: Date[] = [];
  for (let i = 0; i < dayCount; i++) days.push(addDays(weekStart, i));

  const timed: HourlyTimedItem[] = [];
  const untimed: HourlyUntimedItem[] = [];

  // Bucket timed single-day events by their day column; everything else is a band bar.
  const byDay = new Map<number, { event: CalendarEvent; startMin: number; endMin: number }[]>();

  for (const event of events) {
    const start = parseIsoDate(event.start);
    const end = parseIsoDate(event.end);
    const clipped = clipToWeek(start, end, weekStart, weekEnd);
    if (!clipped) continue;

    const singleDay = event.start === event.end;
    const startMin = singleDay ? parseMinutes(event.startTime) : null;

    if (singleDay && startMin !== null) {
      const dayIndex = daysBetween(weekStart, start);
      if (dayIndex < 0 || dayIndex >= dayCount) continue;
      let endMin = parseMinutes(event.endTime) ?? startMin + DEFAULT_DURATION_MIN;
      if (endMin <= startMin) endMin += MINUTES_PER_DAY; // runs past midnight
      const list = byDay.get(dayIndex) ?? [];
      list.push({ event, startMin, endMin });
      byDay.set(dayIndex, list);
    } else {
      const [clippedStart, clippedEnd] = clipped;
      const colStart = daysBetween(weekStart, clippedStart) + 1;
      const span = daysBetween(clippedStart, clippedEnd) + 1;
      untimed.push({ event, colStart, span });
    }
  }

  // Per day: greedily pack overlapping events into the lowest free sub-column.
  let axisStartMin = Infinity;
  let axisEndMin = -Infinity;

  for (const [dayIndex, items] of byDay) {
    items.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
    const laneEnds: number[] = [];
    const placed: (HourlyTimedItem & { _tmp?: never })[] = [];
    for (const it of items) {
      let lane = 0;
      while (lane < laneEnds.length && laneEnds[lane] > it.startMin) lane++;
      laneEnds[lane] = it.endMin;
      placed.push({ event: it.event, dayIndex, startMin: it.startMin, endMin: it.endMin, lane, laneCount: 0 });
      if (it.startMin < axisStartMin) axisStartMin = it.startMin;
      if (it.endMin > axisEndMin) axisEndMin = it.endMin;
    }
    const laneCount = laneEnds.length;
    for (const p of placed) {
      p.laneCount = laneCount;
      timed.push(p);
    }
  }

  const hasTimed = timed.length > 0;
  if (!hasTimed) {
    axisStartMin = 18 * 60; // sensible evening default when nothing is timed yet
    axisEndMin = 24 * 60;
  } else {
    axisStartMin = floorHour(axisStartMin);
    axisEndMin = ceilHour(axisEndMin);
  }

  const hours: number[] = [];
  for (let m = axisStartMin; m <= axisEndMin; m += 60) hours.push(m);

  return {
    weekStart,
    weekEnd,
    dayCount,
    days,
    axisStartMin,
    axisEndMin,
    hours,
    timed,
    untimed,
    hasTimed,
  };
}
