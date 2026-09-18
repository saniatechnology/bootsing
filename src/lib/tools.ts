import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { CATEGORY_KEYS, FLAG_KEYS, GENRE_KEYS } from "./types";
import type { CalendarEvent, EventPatch, FlagKey, NewEventInput } from "./types";
import { nextEventId } from "./store";

/**
 * Tool definitions Claude can call from the chat box, plus the code that
 * actually executes them against the in-memory event list. `web_search`
 * is a server-side tool the Anthropic API runs and resolves itself, so it
 * never reaches `executeTool` below — see the loop in `app/api/chat/route.ts`.
 */

const eventFieldProperties = {
  name: { type: "string", description: "Event title" },
  venue: { type: "string", description: "Venue or location" },
  cat: { type: "string", enum: CATEGORY_KEYS, description: "Category key" },
  start: { type: "string", description: "Start date, ISO yyyy-mm-dd" },
  end: { type: "string", description: "End date, ISO yyyy-mm-dd" },
  cost: { type: "string", description: 'e.g. "Free", "Paid", "€15"' },
  desc: { type: "string", description: "One or two sentence description" },
  link: { type: "string", description: "URL for more info" },
  flags: {
    type: "array",
    items: { type: "string", enum: FLAG_KEYS },
    description: "Optional badges: closing (last chance), rare (one-off), finale",
  },
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
      "Add a new event to the Barcelona cultural calendar. Dates are ISO yyyy-mm-dd; " +
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

export const CALENDAR_TOOL_NAMES = new Set(CALENDAR_TOOLS.map((t) => t.name));

/** The server-side web search tool: executed and resolved by the Anthropic API itself. */
export const WEB_SEARCH_TOOL: Anthropic.Messages.WebSearchTool20260318 = {
  type: "web_search_20260318",
  name: "web_search",
  max_uses: 3,
};

/** Everything sent as the `tools` param on the chat completion call. */
export const ALL_TOOLS: Anthropic.Messages.ToolUnion[] = [WEB_SEARCH_TOOL, ...CALENDAR_TOOLS];

export type ToolResult =
  | { ok: true; event: CalendarEvent }
  | { ok: true; removed: CalendarEvent }
  | { ok: false; error: string };

/** Narrow + validate a loosely-typed tool_use input before trusting it as a NewEventInput. */
function toNewEventInput(input: Record<string, unknown>): NewEventInput | { error: string } {
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
    cost: input.cost as string,
    desc: input.desc as string,
    link: input.link as string,
    flags: Array.isArray(input.flags) ? (input.flags as FlagKey[]) : undefined,
    approx: typeof input.approx === "boolean" ? input.approx : undefined,
    genre: typeof input.genre === "string" ? (input.genre as NewEventInput["genre"]) : undefined,
  };
}

export function executeTool(
  name: string,
  rawInput: Record<string, unknown>,
  events: CalendarEvent[]
): ToolResult {
  switch (name) {
    case "add_event": {
      const parsed = toNewEventInput(rawInput);
      if ("error" in parsed) return { ok: false, error: parsed.error };
      const event: CalendarEvent = {
        id: nextEventId(events),
        ...parsed,
        flags: parsed.flags ?? [],
        approx: parsed.approx ?? false,
        genre: parsed.cat === "MUS" ? parsed.genre ?? "other" : null,
      };
      events.push(event);
      return { ok: true, event };
    }
    case "edit_event": {
      const id = Number(rawInput.id);
      const event = events.find((e) => e.id === id);
      if (!event) return { ok: false, error: `No event with id ${String(rawInput.id)}` };
      const patch = rawInput as Partial<EventPatch>;
      // Applied field by field (rather than a generic `Object.assign`) so each
      // assignment stays type-checked against `CalendarEvent`'s actual field types.
      if (patch.name !== undefined) event.name = patch.name;
      if (patch.venue !== undefined) event.venue = patch.venue;
      if (patch.cat !== undefined) event.cat = patch.cat;
      if (patch.start !== undefined) event.start = patch.start;
      if (patch.end !== undefined) event.end = patch.end;
      if (patch.cost !== undefined) event.cost = patch.cost;
      if (patch.desc !== undefined) event.desc = patch.desc;
      if (patch.link !== undefined) event.link = patch.link;
      if (patch.flags !== undefined) event.flags = patch.flags;
      if (patch.approx !== undefined) event.approx = patch.approx;
      if (patch.genre !== undefined) event.genre = patch.genre;
      return { ok: true, event };
    }
    case "delete_event": {
      const id = Number(rawInput.id);
      const idx = events.findIndex((e) => e.id === id);
      if (idx === -1) return { ok: false, error: `No event with id ${String(rawInput.id)}` };
      const [removed] = events.splice(idx, 1);
      return { ok: true, removed };
    }
    default:
      return { ok: false, error: `Unknown tool "${name}"` };
  }
}
