/**
 * Domain rules for a single event that don't belong to any one consumer:
 * how a validated input becomes a stored event, the short summary shown in
 * change proposals, and what counts as a safe "more info" link. Pure, so both
 * the store and the UI can use it.
 */

import type { CalendarEvent, EventSummary, NewEventInput } from "./types";

/**
 * Turn a validated `NewEventInput` into the full event shape (minus the id,
 * which the database assigns). Defaults `approx` to false and enforces that
 * `genre` is only meaningful for the MUS category: it defaults to "other"
 * there and is forced to null everywhere else. New events are never saved to
 * Home on creation, so `status` starts as null.
 */
export function materializeNewEvent(input: NewEventInput): Omit<CalendarEvent, "id"> {
  return {
    name: input.name,
    venue: input.venue,
    cat: input.cat,
    start: input.start,
    end: input.end,
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    cost: input.cost,
    desc: input.desc,
    link: input.link,
    approx: input.approx ?? false,
    genre: input.cat === "MUS" ? (input.genre ?? "other") : null,
    status: null,
  };
}

/** The handful of fields needed to identify an event in a proposal preview. */
export function summarizeEvent(e: CalendarEvent): EventSummary {
  return { id: e.id, name: e.name, venue: e.venue, start: e.start, end: e.end };
}

/**
 * True for absolute http(s) URLs. Event links come from the model, the
 * research pass and the edit form, and are rendered as `href`s, so anything
 * else (`javascript:`, `data:`, relative paths, empty) must not become a link.
 */
export function isSafeHttpUrl(link: string): boolean {
  try {
    const { protocol } = new URL(link);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
