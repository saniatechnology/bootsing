import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import {
  MODEL,
  cachedSystem,
  cachedTools,
  streamTurn,
  textOf,
  toolUsesOf,
  webSearchTool,
} from "./anthropic-client";
import type { ResearchApiResponse } from "./api-types";
import { toIsoDate } from "./dates";
import type { ProgressEmit } from "./progress";
import { buildResearchPrompt } from "./research-prompt";
import { deleteEventsStartingInWeek, insertEvent, readEvents, readPreferences } from "./store";
import type { IsoDate } from "./types";
import { newEventInputSchema, submitWeekEventsInputSchema, toolInputSchema } from "./validation";
import type { NewEventInput } from "./validation";

const MAX_RESEARCH_LOOPS = 8;
const SUBMIT_TOOL_NAME = "submit_week_events";

const SUBMIT_WEEK_EVENTS_TOOL: Anthropic.Messages.Tool = {
  name: SUBMIT_TOOL_NAME,
  description:
    "Record the real events you found for the target week. Call this once with the full list.",
  input_schema: toolInputSchema(submitWeekEventsInputSchema),
};

const RESEARCH_TOOLS: Anthropic.Messages.ToolUnion[] = [
  // A higher search cap than chat for thorough research; direct calls only,
  // so searches run sequentially rather than as batched sandbox bursts.
  webSearchTool({ maxUses: 5, allowedCallers: ["direct"] }),
  SUBMIT_WEEK_EVENTS_TOOL,
];

const STAGE_LABELS = { [SUBMIT_TOOL_NAME]: "Saving events…" };

export interface WeekResearchResult {
  events: NewEventInput[];
  reply: string;
}

/** Pull the submit_week_events tool call out of a response's content, if present. */
function findSubmit(
  content: Anthropic.Messages.ContentBlock[]
): Anthropic.Messages.ToolUseBlock | undefined {
  return toolUsesOf(content).find((b) => b.name === SUBMIT_TOOL_NAME);
}

/**
 * Validate the model's `submit_week_events` payload and keep only events that
 * fall inside the researched week. Each candidate is checked on its own so one
 * malformed entry doesn't discard the whole batch; an end date outside the
 * week (or before the start) is clamped to the start date.
 */
export function parseSubmittedEvents(
  input: unknown,
  weekStart: IsoDate,
  weekEnd: IsoDate
): NewEventInput[] {
  const raw =
    typeof input === "object" &&
    input !== null &&
    Array.isArray((input as { events?: unknown }).events)
      ? ((input as { events: unknown[] }).events as unknown[])
      : [];
  const events: NewEventInput[] = [];
  for (const candidate of raw) {
    const parsed = newEventInputSchema.safeParse(candidate);
    if (!parsed.success) continue;
    const e = parsed.data;
    if (e.start < weekStart || e.start > weekEnd) continue;
    const end = e.end < e.start || e.end > weekEnd ? e.start : e.end;
    events.push({ ...e, end });
  }
  return events;
}

/**
 * Runs one research pass for a week: asks Claude to web_search real events
 * matching the user's preferences, then submit them. Read-only — it does not
 * touch the database. web_search is resolved server-side by the Anthropic API
 * (surfacing as pause_turn while it runs); the only client tool is
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

  emit?.({ type: "stage", label: "Researching events…" });

  for (let turn = 0; turn < MAX_RESEARCH_LOOPS; turn++) {
    const response = await streamTurn(
      {
        model: MODEL,
        max_tokens: 4096,
        thinking: { type: "adaptive", display: "summarized" },
        output_config: { effort: "medium" },
        system: cachedSystem(system),
        tools: cachedTools(RESEARCH_TOOLS),
        messages,
      },
      { emit, stageLabels: STAGE_LABELS }
    );

    const text = textOf(response.content);
    if (text) finalText = text;

    const submit = findSubmit(response.content);
    if (submit) {
      return { events: parseSubmittedEvents(submit.input, weekStart, weekEnd), reply: finalText };
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
      model: MODEL,
      max_tokens: 4096,
      system: cachedSystem(system),
      tools: cachedTools(RESEARCH_TOOLS),
      tool_choice: { type: "tool", name: SUBMIT_TOOL_NAME },
      messages,
    },
    { emit, stageLabels: STAGE_LABELS }
  );
  const submit = findSubmit(forced.content);
  const events = submit ? parseSubmittedEvents(submit.input, weekStart, weekEnd) : [];
  return { events, reply: finalText };
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
): Promise<ResearchApiResponse> {
  const { events: found, reply } = await runWeekResearch(weekStart, weekEnd, emit);

  emit?.({
    type: "stage",
    label: `Saving ${found.length} event${found.length === 1 ? "" : "s"}…`,
  });
  const removed = await deleteEventsStartingInWeek(weekStart, weekEnd);
  for (const input of found) {
    await insertEvent(input);
  }

  const events = await readEvents();
  return { events, added: found.length, removed, reply };
}
