import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { CHAT_MODEL, streamTurn, cachedSystem, cachedTools } from "./anthropic-client";
import { buildSystemPrompt } from "./system-prompt";
import {
  ALL_TOOLS,
  FIND_EVENTS_TOOL_NAME,
  MUTATING_TOOL_NAMES,
  executeTool,
  extractEventPatch,
  toNewEventInput,
} from "./tools";
import { readEvents, readMeta } from "./store";
import { toIsoDate } from "./dates";
import { weekIndexForDate } from "./grid";
import type { CalendarEvent, EventSummary, ProposedAction } from "./types";
import type { ProgressEmit } from "./progress";

export interface ChatTurnResult {
  reply: string;
  /** Changes the assistant proposes; empty when it only answered or found nothing to do. */
  proposedActions: ProposedAction[];
  events: CalendarEvent[];
  history: MessageParam[];
}

const MAX_AGENT_LOOPS = 6;

/**
 * Runs one user message through the tool-use agent loop. Read-only tools
 * (find_events, and the server-side web_search the Anthropic API resolves
 * itself) execute inline so the model can reason over their results. Mutating
 * tools (add/edit/delete) are NOT executed here — they're collected as
 * `proposedActions` for the user to approve, then replayed by `applyActions`.
 * Nothing is written to disk in this turn.
 */
export async function runChatTurn(
  message: string,
  history: MessageParam[],
  selectedIds: number[] = [],
  emit?: ProgressEmit
): Promise<ChatTurnResult> {
  const [events, meta] = await Promise.all([readEvents(), readMeta()]);

  const todayIso = toIsoDate(new Date());
  const system = buildSystemPrompt({
    todayIso,
    currentWeekIndex: weekIndexForDate(meta.weeks, todayIso),
    weeks: meta.weeks,
    selectedEvents: events.filter((e) => selectedIds.includes(e.id)),
  });

  const messages: MessageParam[] = [...history, { role: "user", content: message }];
  const proposedActions: ProposedAction[] = [];
  let finalText = "";

  emit?.({ type: "stage", label: "Thinking\u2026" });

  for (let turn = 0; turn < MAX_AGENT_LOOPS; turn++) {
    const response = await streamTurn(
      {
        model: CHAT_MODEL,
        max_tokens: 2048,
        thinking: { type: "adaptive", display: "summarized" },
        output_config: { effort: "medium" },
        system: cachedSystem(system),
        tools: cachedTools(ALL_TOOLS),
        messages,
      },
      emit
    );

    const textBlocks = response.content.filter(
      (b): b is Anthropic.Messages.TextBlock => b.type === "text"
    );
    if (textBlocks.length > 0) finalText = textBlocks.map((b) => b.text).join("\n");

    const toolUses = response.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
    );
    const mutating = toolUses.filter((tu) => MUTATING_TOOL_NAMES.has(tu.name));

    // A mutating call ends the planning turn: collect the proposals but never
    // execute them. Persist the assistant turn as text only, so the stored
    // history never contains a tool_use without a matching tool_result (which
    // the Anthropic API would reject on the next turn).
    if (mutating.length > 0) {
      if (textBlocks.length > 0) messages.push({ role: "assistant", content: textBlocks });
      for (const tu of mutating) {
        const action = buildProposedAction(tu, events);
        if (action) proposedActions.push(action);
      }
      break;
    }

    messages.push({ role: "assistant", content: response.content });

    const reads = toolUses.filter((tu) => tu.name === FIND_EVENTS_TOOL_NAME);
    if (reads.length === 0) break;

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = reads.map((tu) => ({
      type: "tool_result",
      tool_use_id: tu.id,
      content: JSON.stringify(
        executeTool(tu.name, tu.input as Record<string, unknown>, events, meta)
      ),
    }));
    messages.push({ role: "user", content: toolResults });

    if (response.stop_reason !== "tool_use") break;
  }

  const reply = finalText || (proposedActions.length > 0 ? "Here's what I'd like to change:" : "");

  return { reply, proposedActions, events, history: messages };
}

function summarizeEvent(e: CalendarEvent): EventSummary {
  return { id: e.id, name: e.name, venue: e.venue, start: e.start, end: e.end };
}

function dateLabel(start: string, end: string): string {
  return start === end ? start : `${start} to ${end}`;
}

/**
 * Turns a mutating tool_use block into a `ProposedAction` for the preview,
 * resolving edit/delete targets against the current events. Returns null when
 * the call is unusable (bad add input, or an id that no longer exists) so it's
 * simply dropped from the proposal rather than shown as something we can't do.
 */
function buildProposedAction(
  tu: Anthropic.Messages.ToolUseBlock,
  events: CalendarEvent[]
): ProposedAction | null {
  const input = tu.input as Record<string, unknown>;
  switch (tu.name) {
    case "add_event": {
      const parsed = toNewEventInput(input);
      if ("error" in parsed) return null;
      return {
        id: tu.id,
        kind: "add",
        input: parsed,
        summary: `Add "${parsed.name}" at ${parsed.venue} (${dateLabel(parsed.start, parsed.end)})`,
      };
    }
    case "edit_event": {
      const target = events.find((e) => e.id === Number(input.id));
      if (!target) return null;
      const patch = extractEventPatch(input);
      return {
        id: tu.id,
        kind: "edit",
        targetId: target.id,
        patch,
        target: summarizeEvent(target),
        summary: `Edit "${target.name}": ${describePatch(patch)}`,
      };
    }
    case "delete_event": {
      const target = events.find((e) => e.id === Number(input.id));
      if (!target) return null;
      return {
        id: tu.id,
        kind: "delete",
        targetId: target.id,
        target: summarizeEvent(target),
        summary: `Delete "${target.name}" at ${target.venue}`,
      };
    }
    default:
      return null;
  }
}

const PATCH_FIELD_LABELS: Record<string, string> = {
  name: "name",
  venue: "venue",
  cat: "category",
  start: "start",
  end: "end",
  cost: "cost",
  desc: "description",
  link: "link",
  approx: "approx flag",
  genre: "genre",
};

function describePatch(patch: Partial<Omit<CalendarEvent, "id">>): string {
  const parts = Object.entries(patch).map(
    ([key, value]) => `${PATCH_FIELD_LABELS[key] ?? key} \u2192 ${JSON.stringify(value)}`
  );
  return parts.length > 0 ? parts.join(", ") : "no changes";
}
