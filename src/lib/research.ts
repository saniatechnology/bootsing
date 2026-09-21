import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { CHAT_MODEL, streamTurn, cachedSystem, cachedTools } from "./anthropic-client";
import { buildResearchPrompt } from "./research-prompt";
import { CATEGORY_KEYS, GENRE_KEYS } from "./types";
import type { CalendarEvent, IsoDate, NewEventInput } from "./types";
import { newEventInputSchema } from "./validation";
import type { ProgressEmit } from "./progress";
import {
  readEvents,
  readMeta,
  readPreferences,
  insertEvent,
  deleteEventsStartingInWeek,
} from "./store";
import { toIsoDate, parseIsoDate, addDays, daysBetween } from "./dates";

const MAX_RESEARCH_LOOPS = 8;
const SUBMIT_TOOL_NAME = "submit_week_events";

/** The event fields the model fills in for each researched event. */
const researchedEventProperties = {
  name: { type: "string", description: "Event title" },
  venue: { type: "string", description: "Venue or location in Barcelona" },
  cat: { type: "string", enum: CATEGORY_KEYS, description: "Category key" },
  start: { type: "string", description: "Start date, ISO yyyy-mm-dd, within the target week" },
  end: { type: "string", description: "End date, ISO yyyy-mm-dd, within the target week" },
  startTime: { type: "string", description: "Start time when known, 24h HH:MM; omit if unknown" },
  endTime: { type: "string", description: "End time when known, 24h HH:MM; omit if unknown" },
  cost: { type: "string", description: 'e.g. "Free", "€15", "Unknown"' },
  desc: { type: "string", description: "One or two factual sentences" },
  link: { type: "string", description: "Source URL for the event" },
  approx: { type: "boolean", description: "True if the date is approximate/unconfirmed" },
  genre: {
    type: "string",
    enum: GENRE_KEYS,
    description: "Only for the MUS category: music genre tag used by the dance filter",
  },
} as const;

const SUBMIT_WEEK_EVENTS_TOOL: Anthropic.Messages.Tool = {
  name: SUBMIT_TOOL_NAME,
  description:
    "Record the real Barcelona events you found for the target week. Call this once with the full list.",
  input_schema: {
    type: "object",
    properties: {
      events: {
        type: "array",
        description: "All events found for the week; may be empty if none were sourced.",
        items: {
          type: "object",
          properties: researchedEventProperties,
          required: ["name", "venue", "cat", "start", "end", "cost", "desc", "link"],
        },
      },
    },
    required: ["events"],
  },
};

/** Web search runs server-side at the Anthropic API; a higher cap than chat for thorough research. */
const WEB_SEARCH_RESEARCH_TOOL: Anthropic.Messages.WebSearchTool20260318 = {
  type: "web_search_20260318",
  name: "web_search",
  max_uses: 5,
  allowed_callers: ["direct"], // sequential searches, not batched sandbox bursts
};

const RESEARCH_TOOLS: Anthropic.Messages.ToolUnion[] = [
  WEB_SEARCH_RESEARCH_TOOL,
  SUBMIT_WEEK_EVENTS_TOOL,
];

export interface WeekResearchResult {
  events: NewEventInput[];
  reply: string;
}

/** Pull the submit_week_events tool call out of a response's content, if present. */
function findSubmit(
  content: Anthropic.Messages.ContentBlock[]
): Anthropic.Messages.ToolUseBlock | undefined {
  return content.find(
    (b): b is Anthropic.Messages.ToolUseBlock =>
      b.type === "tool_use" && b.name === SUBMIT_TOOL_NAME
  );
}

/** Validate and clamp the model's submitted events to the target week. */
function parseSubmittedEvents(
  input: Record<string, unknown>,
  weekStart: IsoDate,
  weekEnd: IsoDate
): NewEventInput[] {
  const raw = Array.isArray(input.events) ? input.events : [];
  const events: NewEventInput[] = [];
  for (const candidate of raw) {
    const parsed = newEventInputSchema.safeParse(candidate);
    if (!parsed.success) continue;
    const e = parsed.data as NewEventInput;
    // Keep only events that actually fall inside the researched week.
    if (e.start < weekStart || e.start > weekEnd) continue;
    if (e.end < e.start || e.end > weekEnd) e.end = e.start;
    events.push(e);
  }
  return events;
}

/**
 * Runs one research pass for a week: asks Claude to web_search real Barcelona
 * events matching the user's preferences, then submit them. Read-only — it does
 * not touch the database. web_search is resolved server-side by the Anthropic
 * API (surfacing as pause_turn while it runs); the only client tool is
 * submit_week_events, which ends the loop.
 */
export async function runWeekResearch(
  weekStart: IsoDate,
  weekEnd: IsoDate,
  emit?: ProgressEmit
): Promise<WeekResearchResult> {
  const preferences = await readPreferences();

  const system = buildResearchPrompt({
    weekStart,
    weekEnd,
    todayIso: toIsoDate(new Date()),
    preferences,
  });

  const messages: MessageParam[] = [
    {
      role: "user",
      content: `Research events for the week of ${weekStart} to ${weekEnd} and submit them.`,
    },
  ];
  let finalText = "";

  emit?.({ type: "stage", label: "Researching events\u2026" });

  for (let turn = 0; turn < MAX_RESEARCH_LOOPS; turn++) {
    const response = await streamTurn(
      {
        model: CHAT_MODEL,
        max_tokens: 4096,
        thinking: { type: "adaptive", display: "summarized" },
        output_config: { effort: "medium" },
        system: cachedSystem(system),
        tools: cachedTools(RESEARCH_TOOLS),
        messages,
      },
      emit
    );

    const textBlocks = response.content.filter(
      (b): b is Anthropic.Messages.TextBlock => b.type === "text"
    );
    if (textBlocks.length > 0) finalText = textBlocks.map((b) => b.text).join("\n");

    const submit = findSubmit(response.content);
    if (submit) {
      const events = parseSubmittedEvents(
        submit.input as Record<string, unknown>,
        weekStart,
        weekEnd
      );
      return { events, reply: finalText };
    }

    messages.push({ role: "assistant", content: response.content });
    // pause_turn: a server tool (web_search) is mid-flight — send the turn back to continue it.
    if (response.stop_reason !== "pause_turn") break;
  }

  // Model never called submit_week_events on its own; force one structured pass.
  messages.push({
    role: "user",
    content: "Now call submit_week_events with every event you found (an empty list if none).",
  });
  const forced = await streamTurn(
    {
      model: CHAT_MODEL,
      max_tokens: 4096,
      system: cachedSystem(system),
      tools: cachedTools(RESEARCH_TOOLS),
      tool_choice: { type: "tool", name: SUBMIT_TOOL_NAME },
      messages,
    },
    emit
  );
  const submit = findSubmit(forced.content);
  const events = submit
    ? parseSubmittedEvents(submit.input as Record<string, unknown>, weekStart, weekEnd)
    : [];
  return { events, reply: finalText };
}

export interface WeekReplaceResult {
  events: CalendarEvent[];
  added: number;
  removed: number;
  reply: string;
}

/**
 * Researches a week's events and replaces the week's current contents with the
 * results: deletes events that START within the week, inserts the newly found
 * events, then re-reads the full list for the client. Multi-week events owned by
 * an earlier week (starting before this week) are left untouched.
 */
export async function researchAndReplaceWeek(
  weekStart: IsoDate,
  weekEnd: IsoDate,
  emit?: ProgressEmit
): Promise<WeekReplaceResult> {
  const { events: found, reply } = await runWeekResearch(weekStart, weekEnd, emit);

  emit?.({
    type: "stage",
    label: `Saving ${found.length} event${found.length === 1 ? "" : "s"}\u2026`,
  });
  const removed = await deleteEventsStartingInWeek(weekStart, weekEnd);
  for (const input of found) {
    await insertEvent(input);
  }

  const events = await readEvents();
  return { events, added: found.length, removed, reply };
}

/** Guard: a week is researchable if it's a configured week or an aligned 7-day window after the last one. */
export async function isResearchableWeek(weekStart: IsoDate, weekEnd: IsoDate): Promise<boolean> {
  const meta = await readMeta();
  if (meta.weeks.length === 0) return false;
  if (meta.weeks.some(([s, e]) => s === weekStart && e === weekEnd)) return true;

  const start = parseIsoDate(weekStart);
  const end = parseIsoDate(weekEnd);
  if (daysBetween(start, end) !== 6) return false; // must be a full 7-day window

  const lastEnd = parseIsoDate(meta.weeks[meta.weeks.length - 1][1]);
  if (start.getTime() <= lastEnd.getTime()) return false; // must be in the future

  // Aligned to the weekly grid extending from the last configured week.
  const diff = daysBetween(addDays(lastEnd, 1), start);
  return diff % 7 === 0;
}
