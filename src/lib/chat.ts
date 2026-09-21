import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import {
  MODEL,
  cachedSystem,
  cachedTools,
  streamTurn,
  textBlocksOf,
  textOf,
  toolUsesOf,
} from "./anthropic-client";
import type { ChatApiResponse } from "./api-types";
import { toIsoDate } from "./dates";
import type { ProgressEmit } from "./progress";
import { buildProposedAction } from "./proposals";
import { readEvents, readMeta } from "./store";
import { buildSystemPrompt } from "./system-prompt";
import { ALL_TOOLS, FIND_EVENTS_TOOL_NAME, MUTATING_TOOL_NAMES, executeTool } from "./tools";
import type { ProposedAction } from "./validation";
import { weekIndexForDate } from "./weeks";

/** What the route streams back as `done`; the history is the SDK's typed message array here. */
export type ChatTurnResult = Omit<ChatApiResponse, "history"> & { history: MessageParam[] };

const MAX_AGENT_LOOPS = 6;

const STAGE_LABELS = { [FIND_EVENTS_TOOL_NAME]: "Looking through the calendar…" };

/**
 * Runs one user message through the tool-use agent loop. Read-only tools
 * (find_events, and the server-side web_search the Anthropic API resolves
 * itself) execute inline so the model can reason over their results. Mutating
 * tools (add/edit/delete) are NOT executed here — they're collected as
 * `proposedActions` for the user to approve, then replayed by `applyActions`.
 * Nothing is written to the database in this turn.
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

  emit?.({ type: "stage", label: "Thinking…" });

  for (let turn = 0; turn < MAX_AGENT_LOOPS; turn++) {
    const response = await streamTurn(
      {
        model: MODEL,
        max_tokens: 2048,
        thinking: { type: "adaptive", display: "summarized" },
        output_config: { effort: "medium" },
        system: cachedSystem(system),
        tools: cachedTools(ALL_TOOLS),
        messages,
      },
      { emit, stageLabels: STAGE_LABELS }
    );

    const text = textOf(response.content);
    if (text) finalText = text;

    const toolUses = toolUsesOf(response.content);
    const mutating = toolUses.filter((tu) => MUTATING_TOOL_NAMES.has(tu.name));

    // A mutating call ends the planning turn: collect the proposals but never
    // execute them. Persist the assistant turn as text only, so the stored
    // history never contains a tool_use without a matching tool_result (which
    // the Anthropic API would reject on the next turn).
    if (mutating.length > 0) {
      const textBlocks = textBlocksOf(response.content);
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
      content: JSON.stringify(executeTool(tu.name, tu.input, events, meta)),
    }));
    messages.push({ role: "user", content: toolResults });

    if (response.stop_reason !== "tool_use") break;
  }

  const reply = finalText || (proposedActions.length > 0 ? "Here's what I'd like to change:" : "");

  return { reply, proposedActions, history: messages };
}
