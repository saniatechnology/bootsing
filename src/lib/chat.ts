import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { getAnthropicClient, CHAT_MODEL } from "./anthropic-client";
import { CHAT_SYSTEM_PROMPT } from "./system-prompt";
import { ALL_TOOLS, CALENDAR_TOOL_NAMES, executeTool } from "./tools";
import { readEvents, writeEvents } from "./store";
import type { CalendarEvent } from "./types";

export interface ChatTurnResult {
  reply: string;
  /** True if any add/edit/delete tool actually ran (and the file was saved). */
  changed: boolean;
  events: CalendarEvent[];
  history: MessageParam[];
}

const MAX_AGENT_LOOPS = 6;

/**
 * Runs one user message through the tool-use agent loop: ask Claude, execute
 * whatever calendar tools it requests, feed the results back, repeat until it
 * stops asking for tools (or the loop cap is hit as a safety valve). Web
 * search is a server-side tool the Anthropic API resolves on its own — it
 * shows up as a `server_tool_use` block, never `tool_use`, so it's naturally
 * skipped by the `CALENDAR_TOOL_NAMES` filter below and needs no handling here.
 */
export async function runChatTurn(
  message: string,
  history: MessageParam[]
): Promise<ChatTurnResult> {
  const anthropic = getAnthropicClient();
  const events = await readEvents();
  const messages: MessageParam[] = [...history, { role: "user", content: message }];

  let changed = false;
  let finalText = "";

  for (let turn = 0; turn < MAX_AGENT_LOOPS; turn++) {
    const response = await anthropic.messages.create({
      model: CHAT_MODEL,
      max_tokens: 1536,
      system: CHAT_SYSTEM_PROMPT,
      tools: ALL_TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    const textBlocks = response.content.filter(
      (b): b is Anthropic.Messages.TextBlock => b.type === "text"
    );
    if (textBlocks.length > 0) finalText = textBlocks.map((b) => b.text).join("\n");

    const toolUses = response.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock =>
        b.type === "tool_use" && CALENDAR_TOOL_NAMES.has(b.name)
    );
    if (toolUses.length === 0) break;

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = toolUses.map((tu) => {
      const result = executeTool(tu.name, tu.input as Record<string, unknown>, events);
      if (result.ok) changed = true;
      return {
        type: "tool_result",
        tool_use_id: tu.id,
        content: JSON.stringify(result),
      };
    });
    messages.push({ role: "user", content: toolResults });

    if (response.stop_reason !== "tool_use") break;
  }

  if (changed) await writeEvents(events);

  return { reply: finalText || "Done.", changed, events, history: messages };
}
