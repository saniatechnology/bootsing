import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { matchesGroup } from "./event-meta";
import { ADD_EVENT_TOOL_NAME, DELETE_EVENT_TOOL_NAME, EDIT_EVENT_TOOL_NAME } from "./proposals";
import type { CalendarEvent, CalendarMeta } from "./types";
import {
  deleteEventToolInputSchema,
  editEventToolInputSchema,
  findEventsInputSchema,
  newEventInputSchema,
  toolInputSchema,
} from "./validation";
import type { FindEventsInput } from "./validation";

/**
 * Tool definitions Claude can call from the chat box, plus the read-only
 * `find_events` executor. Their input schemas are generated from the zod
 * schemas in `validation.ts`, so what the model is told to send is exactly
 * what the server accepts.
 *
 * Mutating tools (add/edit/delete) are never executed here — the chat loop in
 * `chat.ts` turns them into proposals the user approves, which `applyActions`
 * then persists via the store. `web_search` is a server-side tool the
 * Anthropic API runs and resolves itself, so it never reaches `executeTool`.
 */

export const CALENDAR_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: ADD_EVENT_TOOL_NAME,
    description:
      "Add a new event to the Bootsing calendar. Dates are ISO yyyy-mm-dd; " +
      "use the same date for start and end for a single-day event.",
    input_schema: toolInputSchema(newEventInputSchema),
  },
  {
    name: EDIT_EVENT_TOOL_NAME,
    description: "Edit an existing event by id. Only pass the fields that should change.",
    input_schema: toolInputSchema(editEventToolInputSchema),
  },
  {
    name: DELETE_EVENT_TOOL_NAME,
    description: "Remove an event from the calendar by id.",
    input_schema: toolInputSchema(deleteEventToolInputSchema),
  },
];

/** Tool names that change calendar data — these become proposals, never applied inline. */
export const MUTATING_TOOL_NAMES: ReadonlySet<string> = new Set(CALENDAR_TOOLS.map((t) => t.name));

export const FIND_EVENTS_TOOL_NAME = "find_events";

/** Read-only lookup tool: lets the assistant resolve names/dates to event ids before proposing edits. */
export const FIND_EVENTS_TOOL: Anthropic.Messages.Tool = {
  name: FIND_EVENTS_TOOL_NAME,
  description:
    "Search events already in the calendar. All filters are optional and combine with AND; omit them " +
    "to list everything. Use this to find the id(s) of the event(s) the user means before editing or " +
    "deleting.",
  input_schema: toolInputSchema(findEventsInputSchema),
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
  { ok: true; count: number; matches: EventMatch[] } | { ok: false; error: string };

/** Filter the event list by any combination of the `find_events` criteria. */
function findEvents(
  input: FindEventsInput,
  events: readonly CalendarEvent[],
  meta: CalendarMeta
): EventMatch[] {
  const query = input.query?.trim().toLowerCase() ?? "";
  return events
    .filter((e) => {
      if (query && !`${e.name} ${e.venue}`.toLowerCase().includes(query)) return false;
      if (input.group && !matchesGroup(meta, e, input.group)) return false;
      if (input.genre && e.genre !== input.genre) return false;
      if (input.cat && e.cat !== input.cat) return false;
      // Range overlap: keep events whose [start, end] span intersects [from, to].
      if (input.from && e.end < input.from) return false;
      if (input.to && e.start > input.to) return false;
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
 * Invalid input is reported back to the model as an error rather than thrown.
 */
export function executeTool(
  name: string,
  rawInput: unknown,
  events: readonly CalendarEvent[],
  meta: CalendarMeta
): ToolResult {
  if (name !== FIND_EVENTS_TOOL_NAME) return { ok: false, error: `Unknown tool "${name}"` };
  const parsed = findEventsInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid find_events input" };
  }
  const matches = findEvents(parsed.data, events, meta);
  return { ok: true, count: matches.length, matches };
}
