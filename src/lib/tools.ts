import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { CATEGORY_KEYS, GENRE_KEYS, GROUP_KEYS } from "./types";
import type {
  CalendarEvent,
  CalendarMeta,
  CategoryKey,
  GenreKey,
  GroupKey,
  NewEventInput,
} from "./types";

/**
 * Tool definitions Claude can call from the chat box, plus the read-only
 * `find_events` executor. Mutating tools (add/edit/delete) are never executed
 * here — the chat loop turns them into proposals the user approves, which
 * `applyActions` then persists via the store. `web_search` is a server-side
 * tool the Anthropic API runs and resolves itself, so it never reaches
 * `executeTool` below — see the loop in `app/api/chat/route.ts`.
 */

const eventFieldProperties = {
  name: { type: "string", description: "Event title" },
  venue: { type: "string", description: "Venue or location" },
  cat: { type: "string", enum: CATEGORY_KEYS, description: "Category key" },
  start: { type: "string", description: "Start date, ISO yyyy-mm-dd" },
  end: { type: "string", description: "End date, ISO yyyy-mm-dd" },
  startTime: { type: "string", description: "Optional start time, 24h HH:MM" },
  endTime: { type: "string", description: "Optional end time, 24h HH:MM" },
  cost: { type: "string", description: 'e.g. "Free", "Paid", "€15"' },
  desc: { type: "string", description: "One or two sentence description" },
  link: { type: "string", description: "URL for more info" },
  approx: { type: "boolean", description: "True if the date is approximate/unconfirmed" },
  genre: {
    type: "string",
    enum: GENRE_KEYS,
    description: "Only for the MUS category: music genre tag used by the dance filter",
  },
} as const;

export const CALENDAR_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "add_event",
    description:
      "Add a new event to the Bootsing calendar. Dates are ISO yyyy-mm-dd; " +
      "use the same date for start and end for a single-day event.",
    input_schema: {
      type: "object",
      properties: eventFieldProperties,
      required: ["name", "venue", "cat", "start", "end", "cost", "desc", "link"],
    },
  },
  {
    name: "edit_event",
    description: "Edit an existing event by id. Only pass the fields that should change.",
    input_schema: {
      type: "object",
      properties: { id: { type: "integer", description: "The event's id" }, ...eventFieldProperties },
      required: ["id"],
    },
  },
  {
    name: "delete_event",
    description: "Remove an event from the calendar by id.",
    input_schema: {
      type: "object",
      properties: { id: { type: "integer" } },
      required: ["id"],
    },
  },
];

/** Tool names that change calendar data — these become proposals, never applied inline. */
export const MUTATING_TOOL_NAMES = new Set(CALENDAR_TOOLS.map((t) => t.name));

export const FIND_EVENTS_TOOL_NAME = "find_events";

/** Read-only lookup tool: lets the assistant resolve names/dates to event ids before proposing edits. */
export const FIND_EVENTS_TOOL: Anthropic.Messages.Tool = {
  name: FIND_EVENTS_TOOL_NAME,
  description:
    "Search events already in the calendar. All filters are optional and combine with AND; omit them " +
    "to list everything. Use this to find the id(s) of the event(s) the user means before editing or " +
    "deleting.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Case-insensitive substring matched against name and venue" },
      group: { type: "string", enum: GROUP_KEYS, description: "Filter group" },
      genre: { type: "string", enum: GENRE_KEYS, description: "Music genre tag" },
      cat: { type: "string", enum: CATEGORY_KEYS, description: "Category key" },
      from: { type: "string", description: "Range start, ISO yyyy-mm-dd; matches events ending on/after it" },
      to: { type: "string", description: "Range end, ISO yyyy-mm-dd; matches events starting on/before it" },
    },
  },
};

/** The server-side web search tool: executed and resolved by the Anthropic API itself. */
export const WEB_SEARCH_TOOL: Anthropic.Messages.WebSearchTool20260318 = {
  type: "web_search_20260318",
  name: "web_search",
  max_uses: 3,
};

/** Everything sent as the `tools` param on the chat completion call. */
export const ALL_TOOLS: Anthropic.Messages.ToolUnion[] = [
  WEB_SEARCH_TOOL,
  FIND_EVENTS_TOOL,
  ...CALENDAR_TOOLS,
];

/** The event fields returned by `find_events` — enough for the model to pick and act on a result. */
export type EventMatch = Pick<
  CalendarEvent,
  "id" | "name" | "venue" | "cat" | "genre" | "start" | "end" | "cost"
>;

export type ToolResult =
  | { ok: true; count: number; matches: EventMatch[] }
  | { ok: false; error: string };

/**
 * Materialize a validated NewEventInput into the full event shape (minus the
 * id, which the store/DB assigns): defaults `approx`, and applies the rule that
 * `genre` is only meaningful for the MUS category (defaulting to "other" there
 * and forced to null everywhere else).
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
    genre: input.cat === "MUS" ? input.genre ?? "other" : null,
    status: input.status ?? null,
  };
}

/** Narrow + validate a loosely-typed tool_use input before trusting it as a NewEventInput. */
export function toNewEventInput(input: Record<string, unknown>): NewEventInput | { error: string } {
  const required = ["name", "venue", "cat", "start", "end", "cost", "desc", "link"] as const;
  for (const key of required) {
    if (typeof input[key] !== "string" || input[key] === "") {
      return { error: `Missing or invalid required field "${key}"` };
    }
  }
  if (!CATEGORY_KEYS.includes(input.cat as never)) {
    return { error: `Invalid category "${String(input.cat)}"` };
  }
  return {
    name: input.name as string,
    venue: input.venue as string,
    cat: input.cat as NewEventInput["cat"],
    start: input.start as string,
    end: input.end as string,
    startTime: typeof input.startTime === "string" ? input.startTime : undefined,
    endTime: typeof input.endTime === "string" ? input.endTime : undefined,
    cost: input.cost as string,
    desc: input.desc as string,
    link: input.link as string,
    approx: typeof input.approx === "boolean" ? input.approx : undefined,
    genre: typeof input.genre === "string" ? (input.genre as NewEventInput["genre"]) : undefined,
  };
}

/** Pull the recognised, well-typed event fields out of an edit tool_use input (ignoring `id`). */
export function extractEventPatch(
  input: Record<string, unknown>
): Partial<Omit<CalendarEvent, "id">> {
  const patch: Partial<Omit<CalendarEvent, "id">> = {};
  if (typeof input.name === "string") patch.name = input.name;
  if (typeof input.venue === "string") patch.venue = input.venue;
  if (typeof input.cat === "string" && CATEGORY_KEYS.includes(input.cat as never)) {
    patch.cat = input.cat as CategoryKey;
  }
  if (typeof input.start === "string") patch.start = input.start;
  if (typeof input.end === "string") patch.end = input.end;
  if (input.startTime === null) patch.startTime = null;
  else if (typeof input.startTime === "string") patch.startTime = input.startTime;
  if (input.endTime === null) patch.endTime = null;
  else if (typeof input.endTime === "string") patch.endTime = input.endTime;
  if (typeof input.cost === "string") patch.cost = input.cost;
  if (typeof input.desc === "string") patch.desc = input.desc;
  if (typeof input.link === "string") patch.link = input.link;
  if (typeof input.approx === "boolean") patch.approx = input.approx;
  if (input.genre === null) patch.genre = null;
  else if (typeof input.genre === "string" && GENRE_KEYS.includes(input.genre as never)) {
    patch.genre = input.genre as GenreKey;
  }
  return patch;
}

/** Filter the event list by any combination of the `find_events` criteria. */
function findEvents(
  input: Record<string, unknown>,
  events: CalendarEvent[],
  meta: CalendarMeta
): EventMatch[] {
  const query = typeof input.query === "string" ? input.query.trim().toLowerCase() : "";
  const group = GROUP_KEYS.includes(input.group as never) ? (input.group as GroupKey) : null;
  const genre = GENRE_KEYS.includes(input.genre as never) ? (input.genre as GenreKey) : null;
  const cat = CATEGORY_KEYS.includes(input.cat as never) ? (input.cat as CategoryKey) : null;
  const from = typeof input.from === "string" ? input.from : "";
  const to = typeof input.to === "string" ? input.to : "";

  return events
    .filter((e) => {
      if (query && !`${e.name} ${e.venue}`.toLowerCase().includes(query)) return false;
      if (group && !(meta.catGroups[e.cat] ?? []).includes(group)) return false;
      if (genre && e.genre !== genre) return false;
      if (cat && e.cat !== cat) return false;
      // Range overlap: keep events whose [start, end] span intersects [from, to].
      if (from && e.end < from) return false;
      if (to && e.start > to) return false;
      return true;
    })
    .map((e) => ({
      id: e.id,
      name: e.name,
      venue: e.venue,
      cat: e.cat,
      genre: e.genre,
      start: e.start,
      end: e.end,
      cost: e.cost,
    }));
}

/**
 * Runs a read-only tool call inline for the chat agent. Only `find_events` is
 * executed here; mutating tools become proposals and are applied elsewhere.
 */
export function executeTool(
  name: string,
  rawInput: Record<string, unknown>,
  events: CalendarEvent[],
  meta: CalendarMeta
): ToolResult {
  if (name === FIND_EVENTS_TOOL_NAME) {
    const matches = findEvents(rawInput, events, meta);
    return { ok: true, count: matches.length, matches };
  }
  return { ok: false, error: `Unknown tool "${name}"` };
}
