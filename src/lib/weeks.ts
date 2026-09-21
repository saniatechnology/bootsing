/**
 * Week arithmetic shared by the pages, the UI navigation, the chat system
 * prompt and the research guard. The calendar is a list of configured weeks
 * (from `CalendarMeta.weeks`), and the UI can keep navigating forward past
 * that list into "synthetic" 7-day windows that continue the same weekly
 * grid. Every function here is pure; see `weeks.test.ts`.
 */

import { addDays, daysBetween, parseIsoDate, toIsoDate } from "./dates";
import type { IsoDate } from "./types";

/** An inclusive [weekStart, weekEnd] pair of ISO dates. */
export type WeekRange = [IsoDate, IsoDate];

/** How many extra weeks the user may browse past the last week that has content. */
const BROWSE_AHEAD_WEEKS = 8;

/**
 * The week at `index`. Indexes within the configured list return that week;
 * indexes past the end return successive 7-day windows continuing on from the
 * last configured week, so the user can navigate into the future (and research
 * those weeks). `undefined` only when no weeks are configured at all.
 */
export function weekForIndex(weeks: WeekRange[], index: number): WeekRange | undefined {
  if (weeks.length === 0) return undefined;
  if (index < weeks.length) return weeks[index];
  const lastEnd = parseIsoDate(weeks[weeks.length - 1][1]);
  const weeksPastEnd = index - (weeks.length - 1); // 1 = first synthetic week
  const start = addDays(lastEnd, 1 + (weeksPastEnd - 1) * 7);
  return [toIsoDate(start), toIsoDate(addDays(start, 6))];
}

/**
 * Index of the week containing `iso`, extending past the configured list into
 * synthetic weeks (the inverse of `weekForIndex`). Dates before the first week
 * clamp to 0.
 */
export function weekIndexForDate(weeks: WeekRange[], iso: IsoDate): number {
  if (weeks.length === 0) return 0;
  const target = parseIsoDate(iso);
  const t = target.getTime();
  for (let i = 0; i < weeks.length; i++) {
    if (t >= parseIsoDate(weeks[i][0]).getTime() && t <= parseIsoDate(weeks[i][1]).getTime()) {
      return i;
    }
  }
  if (t < parseIsoDate(weeks[0][0]).getTime()) return 0;
  // Past the last configured week: `days` is >= 1 here, so ceil(days / 7) >= 1.
  const lastEnd = parseIsoDate(weeks[weeks.length - 1][1]);
  const days = daysBetween(lastEnd, target);
  return weeks.length - 1 + Math.ceil(days / 7);
}

/**
 * A week may be researched when it is exactly a week the navigation can show:
 * either a configured week or an aligned 7-day window continuing the grid.
 * Anything else (misaligned dates, partial windows, a made-up range inside a
 * configured week) is rejected so the research endpoint can't be pointed at an
 * arbitrary date range.
 */
export function isResearchableWeek(weeks: WeekRange[], [weekStart, weekEnd]: WeekRange): boolean {
  const week = weekForIndex(weeks, weekIndexForDate(weeks, weekStart));
  return week !== undefined && week[0] === weekStart && week[1] === weekEnd;
}

/** The latest start date among `events`, or null when there are none. */
export function latestStart(events: readonly { start: IsoDate }[]): IsoDate | null {
  let latest: IsoDate | null = null;
  for (const e of events) if (latest === null || e.start > latest) latest = e.start;
  return latest;
}

/**
 * The furthest week index the user may navigate to: a fixed number of weeks
 * beyond the week holding the latest event (or beyond `floorIndex` when there
 * are no events), never below `floorIndex`.
 */
export function browseHorizon(
  weeks: WeekRange[],
  latestStartIso: IsoDate | null,
  floorIndex: number
): number {
  const anchor = latestStartIso === null ? floorIndex : weekIndexForDate(weeks, latestStartIso);
  return Math.max(floorIndex, anchor + BROWSE_AHEAD_WEEKS);
}
