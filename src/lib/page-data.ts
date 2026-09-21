import "server-only";

import { toIsoDate } from "./dates";
import { readEvents, readMeta } from "./store";
import type { CalendarEvent, CalendarMeta } from "./types";
import { weekIndexForDate } from "./weeks";

export type CalendarPageData =
  | { ok: true; events: CalendarEvent[]; meta: CalendarMeta; initialWeekIndex: number }
  | { ok: false; message: string };

/**
 * Loads everything the Home and Explore pages need on the server: the events,
 * the calendar meta, and which week to open first. `?w=<index>` picks a week
 * explicitly (the header links use it so switching pages keeps the week);
 * otherwise the page opens on the week containing today.
 */
export async function loadCalendarPage(
  searchParams: Promise<{ w?: string }>
): Promise<CalendarPageData> {
  let events: CalendarEvent[];
  let meta: CalendarMeta;
  try {
    [events, meta] = await Promise.all([readEvents(), readMeta()]);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Failed to load your calendar.",
    };
  }

  const requested = Number((await searchParams).w);
  const initialWeekIndex =
    Number.isInteger(requested) && requested >= 0
      ? requested
      : weekIndexForDate(meta.weeks, toIsoDate(new Date()));

  return { ok: true, events, meta, initialWeekIndex };
}
